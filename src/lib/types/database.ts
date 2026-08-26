export type OrgRole = "admin" | "teacher" | "student";
export type CourseRole = "teacher" | "student";
export type SubmissionStatus = "draft" | "submitted" | "graded" | "returned";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  org_id: string;
  role: OrgRole;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
}

export interface Course {
  id: string;
  org_id: string;
  title: string;
  description: string;
  code: string;
  created_by: string;
  archived: boolean;
  created_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  position: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  content: string;
  position: number;
  created_at: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  user_id: string;
  role: CourseRole;
  created_at: string;
}

export interface Assignment {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_at: string | null;
  points_possible: number;
  created_by: string;
  created_at: string;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  file_url: string | null;
  status: SubmissionStatus;
  submitted_at: string | null;
  score: number | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  org_id: string;
  course_id: string | null;
  author_id: string;
  title: string;
  body: string;
  created_at: string;
}
