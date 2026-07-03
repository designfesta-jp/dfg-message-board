const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();

exports.onMessageCreated = onDocumentCreated(
  {
    document: "spaces/{spaceId}/messages/{msgId}",
    region: "asia-northeast1",
  },
  async (event) => {
    const db = getFirestore();
    const msg = event.data.data();
    const { spaceId } = event.params;

    if (msg.deleted || msg.hidden) return;
    // 出展者自身の投稿は通知しない
    if (msg.isExhibitor) return;

    const spaceSnap = await db.doc(`spaces/${spaceId}`).get();
    if (!spaceSnap.exists) return;
    const spaceData = spaceSnap.data();

    const exhibitions = spaceData.exhibitions || [];
    const ex = msg.exhibitionId
      ? exhibitions.find(e => e.id === msg.exhibitionId)
      : exhibitions[0];

    if (!ex || !ex.notifyEmail) return;

    // 通知がOFFの場合はスキップ
    if (ex.notifyEnabled === false) return;

    const footer = "\n\n※このメールは送信専用です。返信はできません。";
    const footerHtml = "<p style='color:#999;font-size:12px;margin-top:20px;border-top:1px solid #eee;padding-top:10px;'>※このメールは送信専用です。返信はできません。</p>";

    await db.collection("mail").add({
      to: ex.notifyEmail,
      message: {
        subject: `【DFGメッセージボード】${ex.name || spaceData.spaceNumber}に新しいメッセージが届きました`,
        text: `${spaceData.spaceNumber} 「${ex.name || ""}」に新しいメッセージが届きました。\n\n` +
              `送信者: ${msg.sender || "来場者"}\n` +
              `メッセージ: ${msg.text}\n\n` +
              `メッセージボードを確認するには以下のURLにアクセスしてください：\n` +
              `https://dfg-message-board.firebaseapp.com/dfg-landing.html?space=${spaceId}` +
              footer,
        html: `<p><strong>${spaceData.spaceNumber}</strong> 「${ex.name || ""}」に新しいメッセージが届きました。</p>` +
              `<p>送信者: ${msg.sender || "来場者"}<br>` +
              `メッセージ: ${msg.text}</p>` +
              `<p><a href="https://dfg-message-board.firebaseapp.com/dfg-landing.html?space=${spaceId}">メッセージボードを確認する</a></p>` +
              footerHtml,
      },
      createdAt: new Date(),
    });
  }
);
