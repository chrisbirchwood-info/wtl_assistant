import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE: detach a lesson from a course
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ courseId: string, lessonId: string }> }
) {
  try {
    const { courseId, lessonId } = await context.params

    const { error } = await supabase
      .from('course_lessons')
      .delete()
      .eq('course_id', courseId)
      .eq('lesson_id', lessonId)

    if (error) {
      return NextResponse.json({ success: false, message: 'Błąd odpinania lekcji', error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE course lesson error:', error)
    return NextResponse.json({ success: false, message: 'Wystąpił błąd', error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

