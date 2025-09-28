const { Octokit } = require("@octokit/rest");

const TOKEN_A = "PASTE_TOKEN_AKUN_A_DI_SINI";
const TOKEN_B = "PASTE_TOKEN_AKUN_B_DI_SINI";

const OWNER = "Gaeuly";
const REPO = "galaxy-brain-playground";

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
  if (!qaCategory) throw new Error("Kategori 'Q&A' tidak ditemukan di repo ini. Pastikan Discussions sudah aktif.");
  return { repoId, qaCategoryId: qaCategory.id };
}

async function runCycle() {
  try {
    console.log(`[${new Date().toLocaleString()}] Memulai siklus Galaxy Brain...`);
    const { repoId, qaCategoryId } = await getRepoAndCategoryIds();
    console.log("-> ID Repositori & Kategori ditemukan.");

    const timestamp = Date.now();
    const questionTitle = `Pertanyaan Otomatis ${timestamp}`;
    const questionBody = `Ini adalah pertanyaan yang dibuat secara otomatis oleh bot.`;
    
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
    console.log(`-> (Akun B) Membuat pertanyaan: "${questionTitle}"`);

    const answerBody = `Ini adalah jawaban otomatis dari bot untuk pertanyaan ${timestamp}.`;
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
    console.log("-> (Akun A) Memberikan jawaban.");

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
    console.log("-> (Akun B) Menandai jawaban sebagai benar.");
    console.log(`[${new Date().toLocaleString()}] ✅ Siklus Galaxy Brain berhasil!`);
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] ❌ Terjadi error:`, error.message);
  }
}

const JEDA_WAKTU = 30 * 60 * 1000;

console.log("🚀 Bot Galaxy Brain dimulai!");
console.log(`🔁 Siklus akan dijalankan setiap ${JEDA_WAKTU / 60 / 1000} menit.`);

runCycle();
setInterval(runCycle, JEDA_WAKTU);
