import { JOB_CRITERIA } from "./jobCriteria.js";

export function scoreJob(job) {
  const title = (job.title || "").toLowerCase();
  const company = (job.company || "").toLowerCase();
  const location = (job.location || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const { targetRoles, targetLocations, excludedKeywords, sponsorshipFriendlyCompanies } = JOB_CRITERIA;

  // Role match (0-30): title match > description match
  let roleScore = 0;
  let matchedRole = null;
  for (const role of targetRoles) {
    if (title.includes(role)) {
      roleScore = 30;
      matchedRole = role;
      break;
    } else if (desc.slice(0, 500).includes(role) && roleScore < 15) {
      roleScore = 15;
      matchedRole = role;
    }
  }

  // Location match (0-20)
  let locScore = 0;
  if (targetLocations.primary.some(p => location.includes(p))) locScore = 20;
  else if (targetLocations.secondary.some(s => location.includes(s))) locScore = 12;

  // Sponsorship probability (0-25)
  let sponsorScore = 0;
  let sponsorTier = "unknown";
  for (const c of sponsorshipFriendlyCompanies.high) {
    if (company.includes(c)) { sponsorScore = 25; sponsorTier = "high"; break; }
  }
  if (sponsorScore === 0) {
    for (const c of sponsorshipFriendlyCompanies.medium) {
      if (company.includes(c)) { sponsorScore = 15; sponsorTier = "medium"; break; }
    }
  }

  // Seniority fit (0-15, penalized by excluded keywords)
  let seniorityScore = 15;
  for (const kw of excludedKeywords) {
    if (title.includes(kw)) { seniorityScore = 0; break; }
    if (desc.slice(0, 1000).includes(kw)) seniorityScore = Math.max(0, seniorityScore - 5);
  }

  // Recency (0-10)
  let recencyScore = 5;
  if (job.postedAt) {
    try {
      const days = (Date.now() - new Date(job.postedAt).getTime()) / 86400000;
      if (days <= 1) recencyScore = 10;
      else if (days <= 3) recencyScore = 8;
      else if (days <= 7) recencyScore = 5;
      else recencyScore = 2;
    } catch {}
  }

  return {
    total: roleScore + locScore + sponsorScore + seniorityScore + recencyScore,
    breakdown: {
      role: roleScore,
      location: locScore,
      sponsorship: sponsorScore,
      seniority: seniorityScore,
      recency: recencyScore
    },
    matchedRole,
    sponsorTier
  };
}
