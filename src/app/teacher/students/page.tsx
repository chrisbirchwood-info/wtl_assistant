import ProtectedRoute from '@/components/auth/ProtectedRoute'
import StudentList from '@/components/teacher/StudentList'

export default function TeacherStudentsPage() {
  return (
    <ProtectedRoute>
      <StudentList />
    </ProtectedRoute>
  )
}
