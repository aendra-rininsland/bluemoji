import { defineHook } from "$hatk";

// Fires whenever a blue.moji.feed.reaction is indexed, and best-effort
// pushes "X reacted to your post" to the subject post's author.
//
// This is dormant infrastructure today: push requires APNs credentials
// (keyFile/keyId/teamId/bundleId for a real iOS app) that this project
// doesn't have configured, and there's no native app to receive a push in
// the first place — moji.blue is a web app. ctx.push.send() throws when
// push isn't configured or the recipient has no registered token; hatk
// itself already catches and logs on-commit hook errors without blocking
// indexing, but we swallow it here too so routine reactions don't spam logs
// with an entirely expected "not configured" failure. The moment a real
// mobile client registers push tokens against this AppView, this starts
// working with no changes needed here.
export default defineHook(
  "on-commit",
  { collections: ["blue.moji.feed.reaction"] },
  async (ctx) => {
    if (ctx.action !== "create" || !ctx.record) return;

    const subject = ctx.record.subject as string | undefined;
    if (!subject) return;

    // AT-URIs embed the owning DID: at://{did}/{collection}/{rkey}
    const postAuthorDid = subject.match(/^at:\/\/(did:[^/]+)\//)?.[1];
    if (!postAuthorDid || postAuthorDid === ctx.repo) return; // no self-notify

    // Self-attested (see RFC 0001) but low-stakes here: worst case a
    // notification's preview text names the wrong emoji, not a rendering
    // or moderation decision, so verifying against the indexed item isn't
    // worth the extra lookup on this hot path.
    const emojiName = (ctx.record.emoji as { name?: string } | undefined)?.name ?? "an emoji";

    try {
      await ctx.push.send({
        did: postAuthorDid,
        title: "New reaction",
        body: `Someone reacted with ${emojiName} to your post`,
        data: { subject, type: "blue.moji.feed.reaction" },
        collapseId: subject,
      });
    } catch {
      // Expected today: push isn't configured, or the recipient has no
      // registered token. Never let a best-effort notification affect
      // indexing.
    }
  },
);
