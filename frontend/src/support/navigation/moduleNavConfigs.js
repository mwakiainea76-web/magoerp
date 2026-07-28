export const peopleGroups = [
  {
    permission: "manage-staff",
    base: "/staffs",
    links: [
      { label: "Staff Directory", to: "/staffs" },
      { label: "Add Staff", to: "/staffs/create" },
      { label: "Reset Password", to: "/staffs/reset-password" },
      { label: "Status Logs", to: "/staffs/status-logs" },
    ],
  },
  {
    permission: "manage-students",
    base: "/students",
    links: [
      { label: "Student Registry", to: "/students" },
      { label: "Admissions", to: "/students/create" },
      { label: "Reset Password", to: "/students/reset-password" },
      { label: "Status Logs", to: "/students/status-logs" },
    ],
  },
];

export const academicGroups = [
  {
    base: "/departments",
    permission: "manage-departments",
    links: [
      { label: "View Departments", to: "/departments" },
      { label: "Add Department", to: "/departments/create" },
    ],
  },
  {
    permission: "manage-certification-authorities",
    match: (pathname) => pathname.startsWith("/certification-authorities") || pathname.startsWith("/certification-levels"),
    links: [
      { label: "Authorities", to: "/certification-authorities" },
      { label: "Add Setup", to: "/certification-authorities/create" },
      { label: "Levels", to: "/certification-levels" },
      { label: "Add Level", to: "/certification-levels/create" },
      { label: "Grades", to: "/certification-authorities/grades" },
    ],
  },
  {
    base: "/curriculums",
    permission: "manage-curriculums",
    links: [
      { label: "View Curriculums", to: "/curriculums" },
      { label: "Add Curriculum", to: "/curriculums/create" },
      { label: "Mappings", to: "/curriculums/mappings" },
    ],
  },
  {
    permission: ["manage-courses", "manage-units", "manage-course-changes"],
    match: (pathname) => pathname.startsWith("/courses") || pathname.startsWith("/units"),
    links: [
      { label: "Courses", to: "/courses", permission: "manage-courses" },
      { label: "Add Course", to: "/courses/create", permission: "manage-courses" },
      { label: "Enrolments", to: "/courses/enrolments", permission: "manage-courses" },
      { label: "Course Change", to: "/courses/course-change", permission: "manage-course-changes" },
      { label: "Transfers", to: "/courses/transfers", permission: "manage-course-changes" },
      { label: "Units", to: "/units", permission: "manage-units" },
      { label: "Add Unit", to: "/units/create", permission: "manage-units" },
    ],
  },
];

export const calendarGroups = [
  {
    permission: "manage-academic-years",
    base: "/academic-calendar",
    links: [
      { label: "Academic Years", to: "/academic-calendar/years" },
      { label: "Add Year", to: "/academic-calendar/years/create" },
      { label: "Sessions", to: "/academic-calendar/sessions" },
      { label: "Add Session", to: "/academic-calendar/sessions/create" },
      { label: "School Calendar", to: "/academic-calendar/calendar" },
    ],
  },
  {
    permission: "manage-timetables",
    base: "/timetables",
    links: [
      { label: "Timetables", to: "/timetables" },
      { label: "Add Timetable", to: "/timetables/create" },
    ],
  },
  {
    permission: "manage-lecture-rooms",
    base: "/lecture-rooms",
    links: [
      { label: "Lecture Rooms", to: "/lecture-rooms" },
    ],
  },
  {
    permission: "manage-attendance",
    base: "/attendance",
    links: [
      { label: "Attendance", to: "/attendance" },
    ],
  },
];

export const assessmentGroups = [
  {
    permission: "manage-assessments",
    base: "/assessments",
    links: [
      { label: "View Marks", to: "/assessments" },
      { label: "Add Marks", to: "/assessments/add" },
      { label: "Publish Marks", to: "/assessments/publish" },
      { label: "Transcript", to: "/assessments/transcript" },
      { label: "Marksheet", to: "/assessments/marksheet" },
    ],
  },
  {
    permission: "manage-exam-series",
    base: "/exam-series",
    links: [
      { label: "Exam Series", to: "/exam-series" },
    ],
  },
];

export const facilityGroups = [
  {
    permission: "manage-hostels",
    base: "/hostels",
    links: [
      { label: "Hostels", to: "/hostels" },
      { label: "Add Hostel", to: "/hostels/create" },
      { label: "Allocations", to: "/hostel-allocations" },
    ],
  },
];

export const supportGroups = [
  {
    permission: "manage-support-requests",
    base: "/support-requests",
    links: [
      { label: "Support Requests", to: "/support-requests" },
    ],
  },
];

export const systemGroups = [
  {
    permission: "manage-enrollments",
    base: "/operations",
    links: [
      { label: "Session Enrollments", to: "/operations/enrollments" },
    ],
  },
  {
    permission: "manage-system-configurations",
    base: "/system-configurations",
    links: [
      { label: "System Configurations", to: "/system-configurations" },
    ],
  },
  {
    permission: "manage-institution-details",
    base: "/institution-details",
    links: [
      { label: "Institution Details", to: "/institution-details" },
    ],
  },
  {
    permission: "manage-roles",
    base: "/access-roles",
    links: [
      { label: "Roles", to: "/access-roles" },
      { label: "Add Role", to: "/access-roles/create" },
    ],
  },
];

export const securityGroups = [
  {
    permission: "security.view",
    base: "/security",
    links: [
      { label: "Dashboard", to: "/security" },
      { label: "Security Events", to: "/security/events" },
      { label: "Devices", to: "/security/devices" },
      { label: "Active Sessions", to: "/security/sessions" },
      { label: "Blocked IPs", to: "/security/blocked/ips" },
      { label: "Blocked Devices", to: "/security/blocked/devices" },
      { label: "Blocked Users", to: "/security/blocked/users" },
      { label: "API Monitoring", to: "/security/monitoring" },
    ],
  },
];

export const allModuleGroups = [
  ...peopleGroups,
  ...academicGroups,
  ...calendarGroups,
  ...assessmentGroups,
  ...facilityGroups,
  ...supportGroups,
  ...systemGroups,
  ...securityGroups,
];
