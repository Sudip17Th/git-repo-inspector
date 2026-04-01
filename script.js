const repoUrlInput = document.getElementById("repoUrl");
const fetchBtn = document.getElementById("fetchBtn");
const statusEl = document.getElementById("status");

const repoCard = document.getElementById("repoCard");
const readmeCard = document.getElementById("readmeCard");
const contributorsCard = document.getElementById("contributorsCard");
const commitsCard = document.getElementById("commitsCard");

function parseGitHubUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;

    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;

    return {
      owner: parts[0],
      repo: parts[1]
    };
  } catch {
    return null;
  }
}

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#fca5a5" : "#93c5fd";
}

function resetCards() {
  [repoCard, readmeCard, contributorsCard, commitsCard].forEach(el => {
    el.classList.add("hidden");
    el.innerHTML = "";
  });
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "Accept": "application/vnd.github+json"
    }
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status}`);
  }

  return res.json();
}

async function fetchReadme(owner, repo) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`, {
    headers: {
      "Accept": "application/vnd.github.raw+json"
    }
  });

  if (!res.ok) return "README not available.";
  return res.text();
}

fetchBtn.addEventListener("click", async () => {
  resetCards();

  const repoUrl = repoUrlInput.value.trim();
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed) {
    showStatus("Please enter a valid GitHub repository URL.", true);
    return;
  }

  const { owner, repo } = parsed;
  showStatus("Fetching repository data...");

  try {
    const [repoData, contributors, commits, readme] = await Promise.all([
      fetchJson(`https://api.github.com/repos/${owner}/${repo}`),
      fetchJson(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=5`),
      fetchJson(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`),
      fetchReadme(owner, repo)
    ]);

    repoCard.innerHTML = `
      <h2>${repoData.full_name}</h2>
      <p>${repoData.description || "No description available."}</p>
      <p><strong>⭐ Stars:</strong> ${repoData.stargazers_count}</p>
      <p><strong>🍴 Forks:</strong> ${repoData.forks_count}</p>
      <p><strong>🐞 Open Issues:</strong> ${repoData.open_issues_count}</p>
      <p><strong>💻 Main Language:</strong> ${repoData.language || "Unknown"}</p>
      <p><strong>🔗 Repo:</strong> <a href="${repoData.html_url}" target="_blank">${repoData.html_url}</a></p>
    `;
    repoCard.classList.remove("hidden");

    readmeCard.innerHTML = `
      <h3>README (preview)</h3>
      <pre style="white-space: pre-wrap;">${readme.substring(0, 3000)}</pre>
    `;
    readmeCard.classList.remove("hidden");

    contributorsCard.innerHTML = `
      <h3>Top Contributors</h3>
      <ul>
        ${contributors.map(c => `<li><a href="${c.html_url}" target="_blank">${c.login}</a> (${c.contributions} contributions)</li>`).join("")}
      </ul>
    `;
    contributorsCard.classList.remove("hidden");

    commitsCard.innerHTML = `
      <h3>Recent Commits</h3>
      <ul>
        ${commits.map(c => `<li>${c.commit.message}</li>`).join("")}
      </ul>
    `;
    commitsCard.classList.remove("hidden");

    showStatus("Done!");
  } catch (err) {
    console.error(err);
    showStatus("Failed to fetch repository data. It may be private, invalid, or rate-limited.", true);
  }
});