import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extractFormIdFromUrl, getGoogleConfigFromEnv, listFormResponses, refreshAccessToken, getFormMetadata, getFormResponse } from '@/lib/google-forms'

type Body = { teacherId: string; formId?: string; link?: string }

function extractEmailFromResponse(response: any): string | null {
  try {
    if (response.respondentEmail) return response.respondentEmail
    
    // Szukaj w odpowiedziach
    if (response.answers) {
      for (const answer of Object.values(response.answers)) {
        if ((answer as any).textAnswers?.answers?.[0]?.value?.includes('@')) {
          return (answer as any).textAnswers.answers[0].value
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Missing Supabase env' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = (await request.json()) as Body
    const teacherId = body.teacherId
    const formId = body.formId || (body.link ? extractFormIdFromUrl(body.link) : null)
    if (!teacherId || !formId) {
      return NextResponse.json({ error: 'Missing teacherId or formId/link' }, { status: 400 })
    }

    // Load refresh_token for teacher
    const { data: tokenRow, error: tokenError } = await supabase
      .from('google_oauth_tokens')
      .select('refresh_token')
      .eq('user_id', teacherId)
      .eq('provider', 'google')
      .single()

    if (tokenError || !tokenRow?.refresh_token) {
      return NextResponse.json({ error: 'Google not connected for this teacher' }, { status: 400 })
    }

    const { clientId, clientSecret } = getGoogleConfigFromEnv()
    const refreshed = await refreshAccessToken({
      refresh_token: tokenRow.refresh_token,
      clientId,
      clientSecret,
    })

    // Fetch form metadata
    const formMetadata = await getFormMetadata({ formId, accessToken: refreshed.access_token })
    const metaInfo: any = (formMetadata as any).info || {}
    const title = (formMetadata as any).title || metaInfo.title || metaInfo.documentTitle || `Ankieta ${formId.substring(0, 8)}...`
    const description = (formMetadata as any).description || metaInfo.description || null
    console.log('Form metadata title:', title)

    // Fetch responses with pagination
    const responses: any[] = []
    let pageToken: string | undefined = undefined
    do {
      const page = await listFormResponses({ formId, accessToken: refreshed.access_token, pageToken })
      if (page.responses?.length) responses.push(...page.responses)
      pageToken = page.nextPageToken
    } while (pageToken)

    // Ensure each response has full 'answers' payload
    const detailedResponses: any[] = []
    for (const r of responses) {
      try {
        if (r.answers) {
          detailedResponses.push(r)
        } else {
          const full = await getFormResponse({ formId, responseId: r.responseId, accessToken: refreshed.access_token })
          detailedResponses.push({ ...r, ...full })
        }
      } catch (e) {
        // If one fails, still proceed with basic row
        detailedResponses.push(r)
      }
    }

    // Store form metadata in survey_forms
    const { error: formError } = await supabase
      .from('survey_forms')
      .upsert({
        form_id: formId,
        teacher_id: teacherId,
        title,
        description,
        questions: (formMetadata as any).items || null,
        total_responses: responses.length,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'form_id' })

    if (formError) {
      return NextResponse.json({ error: 'Failed to save form metadata', details: formError.message }, { status: 500 })
    }

    // Store responses in new structured format
    const responsesToInsert = detailedResponses.map((r: any) => ({
      response_id: r.responseId,
      form_id: formId,
      respondent_email: r.respondentEmail || extractEmailFromResponse(r),
      submitted_at: r.lastSubmittedTime || r.createTime || new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }))

    if (responsesToInsert.length > 0) {
      const { data: insertedResponses, error: responsesError } = await supabase
        .from('survey_responses')
        .upsert(responsesToInsert, { onConflict: 'response_id,form_id' })
        .select('id, response_id')

      if (responsesError) {
        return NextResponse.json({ error: 'Failed to save responses', details: responsesError.message }, { status: 500 })
      }

      // Ensure we have DB IDs also for rows that were updated (not returned by upsert)
      const responseIds = detailedResponses.map((r: any) => r.responseId)
      const { data: allRespRows, error: fetchRespError } = await supabase
        .from('survey_responses')
        .select('id, response_id')
        .eq('form_id', formId)
        .in('response_id', responseIds)
      if (fetchRespError) {
        return NextResponse.json({ error: 'Failed to fetch responses after upsert', details: fetchRespError.message }, { status: 500 })
      }

      // Build question mapping from form metadata
      const questionMap = new Map()
      if ((formMetadata as any).items) {
        ;(formMetadata as any).items.forEach((item: any) => {
          if (item?.questionItem?.question) {
            const q = item.questionItem.question
            const type = q.choiceQuestion
              ? 'MULTIPLE_CHOICE'
              : q.textQuestion
              ? 'SHORT_ANSWER'
              : q.paragraphQuestion
              ? 'PARAGRAPH_TEXT'
              : 'UNKNOWN'
            questionMap.set(q.questionId, {
              title: item.title,
              type,
            })
          }
        })
      }

      // Store detailed answers
      const allAnswers: any[] = []
      console.log(`Processing ${detailedResponses.length} responses for detailed answers...`)
      detailedResponses.forEach((r: any) => {
        const responseDbId = (allRespRows || insertedResponses || []).find((ir: any) => ir.response_id === r.responseId)?.id
        console.log(`Processing response ${r.responseId}, DB ID: ${responseDbId}, has answers: ${!!r.answers}`)
        if (responseDbId && r.answers) {
          Object.entries(r.answers).forEach(([questionId, answer]: [string, any]) => {
            let answerText: string | null = null
            let answerValue: any = null

            const questionInfo = questionMap.get(questionId)

            if (answer?.textAnswers?.answers?.[0]?.value) {
              answerText = answer.textAnswers.answers[0].value
            } else if (Array.isArray(answer?.choiceAnswers?.answers) && answer.choiceAnswers.answers.length > 0) {
              answerText = answer.choiceAnswers.answers.map((a: any) => a.value).join(', ')
              answerValue = answer.choiceAnswers.answers
            } else if (answer) {
              // Fallback: keep raw answer object for visibility
              try { answerValue = answer } catch {}
            }

            if (answerText !== null || answerValue !== null) {
              const answerObj = {
                response_id: responseDbId,
                question_id: questionId,
                question_text: questionInfo?.title || `Pytanie ${questionId}`,
                question_type: questionInfo?.type || (answer?.textAnswers ? 'SHORT_ANSWER' : (answer?.choiceAnswers ? 'MULTIPLE_CHOICE' : 'UNKNOWN')),
                answer_text: answerText,
                answer_value: answerValue,
                created_at: new Date().toISOString()
              }
              console.log('Adding answer:', JSON.stringify(answerObj))
              allAnswers.push(answerObj)
            } else {
              console.log('Skipping empty answer for question:', questionId)
            }
          })
        }
      })

      if (allAnswers.length > 0) {
        console.log(`Saving ${allAnswers.length} answers to database...`)
        const { error: answersError } = await supabase
          .from('survey_answers')
          .upsert(allAnswers, { onConflict: 'response_id,question_id' })

        if (answersError) {
          console.error('Error saving answers:', answersError.message)
        } else {
          console.log(`✅ Saved ${allAnswers.length} answers successfully`)
        }
      } else {
        console.log('No answers to save')
      }
    }

    return NextResponse.json({ 
      ok: true, 
      formId,
      syncedAt: new Date().toISOString(),
      count: responsesToInsert.length,
      totalResponses: responses.length
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Unexpected error' }, { status: 500 })
  }
}
