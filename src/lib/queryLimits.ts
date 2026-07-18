// Safety caps for "fetch all of the current user's rows" queries. These
// tables have no pagination UI, so an unbounded query would download and
// render every row a long-tenured user has ever created in one page load.
// The caps are generous enough that no real user should ever hit them; they
// exist only to put a ceiling on the worst case (e.g. a compromised/scripted
// account inserting rows directly via the API) rather than to page real usage.
export const MAX_MATCHES_PER_FETCH = 2000;
export const MAX_SCHEDULES_PER_FETCH = 2000;
export const MAX_VIDEO_ANALYSES_PER_FETCH = 1000;
