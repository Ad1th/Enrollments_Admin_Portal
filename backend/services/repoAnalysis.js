// Automatic checks on a submitted GitHub repo, using the REST API only (no
// cloning or running code). GITHUB_TOKEN lifts the 60 req/hour anonymous limit.
const API = "https://api.github.com";

const gh = async (path) => {
  const res = await fetch(`${API}${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "mfc-admin-portal",
      ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    },
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data, link: res.headers.get("link") || "" };
};

const lastPage = (link) => Number((link.match(/[?&]page=(\d+)>; rel="last"/) || [])[1] || 0);

export const parseRepo = (url) => {
  const m = String(url || "").match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?:[/?#]|$)/i);
  return m ? `${m[1]}/${m[2]}`.toLowerCase() : null;
};

const TEST_RE = /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[cm]?[jt]sx?$|_test\.(go|py)$|(^|\/)test_[^/]*\.py$/i;

export const analyseRepo = async (fullName) => {
  const repo = await gh(`/repos/${fullName}`);
  if (!repo.ok) {
    return { ok: false, repo: fullName, error: repo.status === 404 ? "Repo not found or private" : `GitHub error ${repo.status}` };
  }
  const r = repo.data;

  const [languages, commitsPage, countProbe, contributors, tree] = await Promise.all([
    gh(`/repos/${fullName}/languages`),
    gh(`/repos/${fullName}/commits?per_page=100`),
    gh(`/repos/${fullName}/commits?per_page=1`),
    gh(`/repos/${fullName}/contributors?per_page=100&anon=1`),
    gh(`/repos/${fullName}/git/trees/${encodeURIComponent(r.default_branch)}?recursive=1`),
  ]);

  const commits = commitsPage.ok && Array.isArray(commitsPage.data) ? commitsPage.data : [];
  const totalCommits = lastPage(countProbe.link) || commits.length;
  // With per_page=1 the last page holds the very first commit.
  let firstCommitAt = commits.length ? commits[commits.length - 1].commit?.author?.date : null;
  if (totalCommits > commits.length) {
    const first = await gh(`/repos/${fullName}/commits?per_page=1&page=${totalCommits}`);
    firstCommitAt = first.data?.[0]?.commit?.author?.date || firstCommitAt;
  }
  const activeDays = new Set(commits.map((c) => (c.commit?.author?.date || "").slice(0, 10)).filter(Boolean)).size;

  const langTotal = Object.values(languages.data || {}).reduce((a, b) => a + b, 0) || 1;
  const paths = (tree.data?.tree || []).map((t) => t.path);

  const report = {
    ok: true,
    repo: r.full_name,
    url: r.html_url,
    description: r.description,
    homepage: r.homepage || null,
    owner: r.owner?.login,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    fork: r.fork,
    forkedFrom: r.fork ? r.parent?.full_name || null : null,
    archived: r.archived,
    stars: r.stargazers_count,
    license: r.license?.spdx_id || null,
    languages: Object.entries(languages.data || {})
      .map(([name, bytes]) => ({ name, pct: Math.round((bytes / langTotal) * 100) }))
      .filter((l) => l.pct > 0)
      .slice(0, 6),
    commits: { total: totalCommits, firstAt: firstCommitAt, activeDays },
    contributors: (contributors.data || []).map((c) => c.login || c.name).filter(Boolean).slice(0, 20),
    files: paths.length,
    hasReadme: paths.some((p) => /^readme(\.|$)/i.test(p)),
    hasTests: paths.some((p) => TEST_RE.test(p)),
    hasCI: paths.some((p) => p.startsWith(".github/workflows/")),
    hasDocker: paths.some((p) => /(^|\/)dockerfile$/i.test(p)),
  };
  return report;
};

// Human-readable signals, given the report and optionally the applicant's
// linked GitHub login and submission time.
export const signalsFor = (report, { githubLogin, submittedAt } = {}) => {
  if (!report?.ok) return [];
  const s = [];
  if (report.fork) s.push({ level: "warn", text: `Fork of ${report.forkedFrom || "another repo"}` });
  if (report.commits.total <= 3) s.push({ level: "warn", text: `Only ${report.commits.total} commit(s): possibly uploaded in one go` });
  else s.push({ level: "good", text: `${report.commits.total} commits over ${report.commits.activeDays} active day(s)` });
  if (githubLogin) {
    const login = githubLogin.toLowerCase();
    const involved =
      report.owner?.toLowerCase() === login || report.contributors.some((c) => c.toLowerCase() === login);
    s.push(
      involved
        ? { level: "good", text: `Linked GitHub @${githubLogin} owns or contributed` }
        : { level: "warn", text: `Linked GitHub @${githubLogin} is not the owner or a contributor` }
    );
  }
  if (submittedAt && report.createdAt && new Date(submittedAt) - new Date(report.createdAt) < 2 * 864e5) {
    s.push({ level: "info", text: "Repo created within 2 days of submitting" });
  }
  s.push(report.hasReadme ? { level: "good", text: "Has a README" } : { level: "info", text: "No README" });
  if (report.hasTests) s.push({ level: "good", text: "Has tests" });
  if (report.hasCI) s.push({ level: "good", text: "Has CI workflows" });
  if (report.homepage) s.push({ level: "good", text: "Has a live demo link" });
  return s;
};
