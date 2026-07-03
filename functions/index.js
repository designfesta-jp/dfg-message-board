const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
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


// 毎日午前3時（JST）に、終了日を過ぎたグループ化を自動解除
exports.cleanupExpiredGroups = onSchedule(
  {
    schedule: "0 3 * * *",
    timeZone: "Asia/Tokyo",
    region: "asia-northeast1",
  },
  async (event) => {
    const db = getFirestore();
    const spacesSnap = await db.collection("spaces").get();
    const spaces = spacesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const now = new Date();

    // グループ化されている（mainSpaceIdを持つ）スペースを抽出
    const groupedSubs = spaces.filter(sp => sp.mainSpaceId);

    for (const sub of groupedSubs) {
      const mainSpace = spaces.find(sp => sp.id === sub.mainSpaceId);
      if (!mainSpace) {
        // メインが見つからない（削除済みなど）場合は解除
        await db.doc(`spaces/${sub.id}`).update({ mainSpaceId: null });
        continue;
      }

      // メインスペースの現在の展示（最新＝配列先頭）の終了日を確認
      const mainExhibitions = mainSpace.exhibitions || [];
      const latestEx = mainExhibitions[0];

      if (!latestEx || !latestEx.endDate) continue;

      const endDate = new Date(latestEx.endDate + "T23:59:59+09:00");
      const diffDays = Math.floor((now - endDate) / (1000 * 60 * 60 * 24));

      // 終了日翌日以降（1日以上経過）ならグループ解除
      if (diffDays >= 1) {
        await db.doc(`spaces/${sub.id}`).update({ mainSpaceId: null });
      }
    }
  }
);
