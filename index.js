const { Octokit } = require("@octokit/rest");

const TOKEN_A = ""; // Token for Account A 
const TOKEN_B = ""; // Token for Account B

const OWNER = "Gaeuly";
const REPO = "galaxy-brain";

const qaBank = [
  {
    question: "What is the difference between git fetch and git pull?",
    answer: "In short, `git fetch` only downloads new data from the remote without merging it. On the other hand, `git pull` is basically `git fetch` followed immediately by `git merge`."
  },
  {
    question: "How do I create a .gitignore file?",
    answer: "Easy. Just create a new file in the root of your project and name it `.gitignore`. Then, list the files or folders you want to ignore, one per line."
  },
  {
    question: "How can I squash commits in a GitHub Pull Request?",
    answer: "When merging a PR on GitHub, click the dropdown arrow next to the merge button. Choose 'Squash and merge'. This will combine all commits into a single one."
  },
  {
    question: "What does `git revert` do?",
    answer: "`git revert <commit-hash>` creates a new commit that undoes the changes introduced by a previous commit. It does not delete history, but instead adds a new commit that reverses it."
  },
  {
    question: "When should I create a new branch?",
    answer: "Best practice is to always create a new branch whenever you're working on a new feature or bug fix. This keeps the `main` branch clean and stable."
  }
];

const octokitA = new Octokit({ auth: TOKEN_A });
const octokitB = new Octokit({ auth: TOKEN_B });

async function getRepoAndCategoryIds() {
  const response = await octokitA.graphql(
    `
    query getRepo($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        id
        discussionCategories(first: 10) {
          nodes {
            id
            name
          }
        }
      }
    }
    `,
    { owner: OWNER, repo: REPO }
  );
  const repoId = response.repository.id;
  const qaCategory = response.repository.discussionCategories.nodes.find(
    (category) => category.name === "Q&A"
  );
  if (!qaCategory) throw new Error("Category 'Q&A' not found. Make sure Discussions are enabled.");
  return { repoId, qaCategoryId: qaCategory.id };
}

async function runCycle() {
  try {
    console.log(`[${new Date().toLocaleString()}] Starting Galaxy Brain cycle...`);
    const { repoId, qaCategoryId } = await getRepoAndCategoryIds();
    console.log("-> Repository & Category IDs retrieved.");

    const randomQA = qaBank[Math.floor(Math.random() * qaBank.length)];
    
    const questionTitle = randomQA.question;
    const questionBody = `Hi everyone, I have a question: ${randomQA.question} Any help would be appreciated!`;
    const answerBody = `Here’s what I know: ${randomQA.answer} Hope this helps!`;
    
    const discussionResponse = await octokitB.graphql(
      `
      mutation createDiscussion($repoId: ID!, $categoryId: ID!, $title: String!, $body: String!) {
        createDiscussion(input: {
          repositoryId: $repoId,
          categoryId: $categoryId,
          title: $title,
          body: $body
        }) {
          discussion {
            id
            title
          }
        }
      }
      `,
      { repoId, categoryId: qaCategoryId, title: questionTitle, body: questionBody }
    );
    const discussionId = discussionResponse.createDiscussion.discussion.id;
    console.log(`-> (Account B) Created question: "${questionTitle}"`);

    const commentResponse = await octokitA.graphql(
      `
      mutation addComment($discussionId: ID!, $body: String!) {
        addDiscussionComment(input: {
          discussionId: $discussionId,
          body: $body
        }) {
          comment {
            id
          }
        }
      }
      `,
      { discussionId, body: answerBody }
    );
    const commentId = commentResponse.addDiscussionComment.comment.id;
    console.log("-> (Account A) Posted an answer.");

    await octokitB.graphql(
      `
      mutation markAsAnswer($commentId: ID!) {
        markDiscussionCommentAsAnswer(input: {
          id: $commentId
        }) {
          clientMutationId
        }
      }
      `,
      { commentId }
    );
    console.log("-> (Account B) Marked answer as accepted.");
    console.log(`[${new Date().toLocaleString()}] ✅ Galaxy Brain cycle completed successfully!`);
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] ❌ Error occurred:`, error.message);
  }
}

const INTERVAL = 30 * 60 * 1000;

console.log("🚀 Galaxy Brain Bot (Human-like Version) started!");
console.log(`🔁 Cycle will run every ${INTERVAL / 60 / 1000} minutes.`);

runCycle();
setInterval(runCycle, INTERVAL);
