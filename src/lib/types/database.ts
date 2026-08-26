export type OrgRole = "admin" | "teacher" | "student";
export type CourseRole = "teacher" | "student";
export type SubmissionStatus = "draft" | "submitted" | "graded" | "returned";
export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type ResourceType = "link" | "file";
export type CalendarScope = "org" | "course" | "personal";

export const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
];

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
  calendar_token: string;
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

export interface CourseResource {
  id: string;
  module_id: string;
  type: ResourceType;
  title: string;
  description: string;
  url: string;
  position: number;
  created_at: string;
}

export interface Room {
  id: string;
  org_id: string;
  name: string;
  capacity: number | null;
  created_at: string;
}

export interface Period {
  id: string;
  org_id: string;
  name: string;
  position: number;
  start_time: string;
  end_time: string;
  created_at: string;
}

export interface TimetableEntry {
  id: string;
  org_id: string;
  course_id: string;
  period_id: string;
  room_id: string | null;
  teacher_id: string | null;
  weekday: Weekday;
  created_at: string;
}

export interface Superadmin {
  id: string;
  email: string;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  org_id: string;
  course_id: string | null;
  owner_id: string | null;
  scope: CalendarScope;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  created_by: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  org_id: string;
  is_group: boolean;
  title: string | null;
  created_by: string;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}
