/**
 * GENERATED CODE - DO NOT MODIFY
 */
import {
  type LexiconDoc,
  Lexicons,
  ValidationError,
  type ValidationResult,
} from "@atproto/lexicon";
import { type $Typed, is$typed, maybe$typed } from "./util.js";

export const schemaDict = {
  AppBskyActorDefs: {
    id: "app.bsky.actor.defs",
    defs: {
      nux: {
        type: "object",
        required: ["id", "completed"],
        properties: {
          id: {
            type: "string",
            maxLength: 100,
          },
          data: {
            type: "string",
            maxLength: 3000,
            description:
              "Arbitrary data for the NUX. The structure is defined by the NUX itself. Limited to 300 characters.",
            maxGraphemes: 300,
          },
          completed: {
            type: "boolean",
            default: false,
          },
          expiresAt: {
            type: "string",
            format: "datetime",
            description:
              "The date and time at which the NUX will expire and should be considered completed.",
          },
        },
        description: "A new user experiences (NUX) storage object",
      },
      mutedWord: {
        type: "object",
        required: ["value", "targets"],
        properties: {
          id: {
            type: "string",
          },
          value: {
            type: "string",
            maxLength: 10000,
            description: "The muted word itself.",
            maxGraphemes: 1000,
          },
          targets: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#mutedWordTarget",
              type: "ref",
            },
            description: "The intended targets of the muted word.",
          },
          expiresAt: {
            type: "string",
            format: "datetime",
            description:
              "The date and time at which the muted word will expire and no longer be applied.",
          },
          actorTarget: {
            type: "string",
            default: "all",
            description:
              "Groups of users to apply the muted word to. If undefined, applies to all users.",
            knownValues: ["all", "exclude-following"],
          },
        },
        description: "A word that the account owner has muted.",
      },
      savedFeed: {
        type: "object",
        required: ["id", "type", "value", "pinned"],
        properties: {
          id: {
            type: "string",
          },
          type: {
            type: "string",
            knownValues: ["feed", "list", "timeline"],
          },
          value: {
            type: "string",
          },
          pinned: {
            type: "boolean",
          },
        },
      },
      statusView: {
        type: "object",
        required: ["status", "record"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          embed: {
            refs: ["lex:app.bsky.embed.external#view"],
            type: "union",
            description: "An optional embed associated with the status.",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          record: {
            type: "unknown",
          },
          status: {
            type: "string",
            description: "The status for the account.",
            knownValues: ["app.bsky.actor.status#live"],
          },
          isActive: {
            type: "boolean",
            description:
              "True if the status is not expired, false if it is expired. Only present if expiration was set.",
          },
          expiresAt: {
            type: "string",
            format: "datetime",
            description:
              "The date when this status will expire. The application might choose to no longer return the status after expiration.",
          },
          isDisabled: {
            type: "boolean",
            description:
              "True if the user's go-live access has been disabled by a moderator, false otherwise.",
          },
        },
      },
      preferences: {
        type: "array",
        items: {
          refs: [
            "lex:app.bsky.actor.defs#adultContentPref",
            "lex:app.bsky.actor.defs#contentLabelPref",
            "lex:app.bsky.actor.defs#savedFeedsPref",
            "lex:app.bsky.actor.defs#savedFeedsPrefV2",
            "lex:app.bsky.actor.defs#personalDetailsPref",
            "lex:app.bsky.actor.defs#declaredAgePref",
            "lex:app.bsky.actor.defs#feedViewPref",
            "lex:app.bsky.actor.defs#threadViewPref",
            "lex:app.bsky.actor.defs#interestsPref",
            "lex:app.bsky.actor.defs#mutedWordsPref",
            "lex:app.bsky.actor.defs#hiddenPostsPref",
            "lex:app.bsky.actor.defs#bskyAppStatePref",
            "lex:app.bsky.actor.defs#labelersPref",
            "lex:app.bsky.actor.defs#postInteractionSettingsPref",
            "lex:app.bsky.actor.defs#verificationPrefs",
            "lex:app.bsky.actor.defs#liveEventPreferences",
          ],
          type: "union",
        },
      },
      profileView: {
        type: "object",
        required: ["did", "handle"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          debug: {
            type: "unknown",
            description: "Debug information for internal development",
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          handle: {
            type: "string",
            format: "handle",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          status: {
            ref: "lex:app.bsky.actor.defs#statusView",
            type: "ref",
          },
          viewer: {
            ref: "lex:app.bsky.actor.defs#viewerState",
            type: "ref",
          },
          pronouns: {
            type: "string",
          },
          createdAt: {
            type: "string",
            format: "datetime",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          associated: {
            ref: "lex:app.bsky.actor.defs#profileAssociated",
            type: "ref",
          },
          description: {
            type: "string",
            maxLength: 2560,
            maxGraphemes: 256,
          },
          displayName: {
            type: "string",
            maxLength: 640,
            maxGraphemes: 64,
          },
          verification: {
            ref: "lex:app.bsky.actor.defs#verificationState",
            type: "ref",
          },
        },
      },
      viewerState: {
        type: "object",
        properties: {
          muted: {
            type: "boolean",
          },
          blocking: {
            type: "string",
            format: "at-uri",
          },
          blockedBy: {
            type: "boolean",
          },
          following: {
            type: "string",
            format: "at-uri",
          },
          followedBy: {
            type: "string",
            format: "at-uri",
          },
          mutedByList: {
            ref: "lex:app.bsky.graph.defs#listViewBasic",
            type: "ref",
          },
          blockingByList: {
            ref: "lex:app.bsky.graph.defs#listViewBasic",
            type: "ref",
          },
          knownFollowers: {
            ref: "lex:app.bsky.actor.defs#knownFollowers",
            type: "ref",
            description: "This property is present only in selected cases, as an optimization.",
          },
          activitySubscription: {
            ref: "lex:app.bsky.notification.defs#activitySubscription",
            type: "ref",
            description: "This property is present only in selected cases, as an optimization.",
          },
        },
        description:
          "Metadata about the requesting account's relationship with the subject account. Only has meaningful content for authed requests.",
      },
      feedViewPref: {
        type: "object",
        required: ["feed"],
        properties: {
          feed: {
            type: "string",
            description: "The URI of the feed, or an identifier which describes the feed.",
          },
          hideReplies: {
            type: "boolean",
            description: "Hide replies in the feed.",
          },
          hideReposts: {
            type: "boolean",
            description: "Hide reposts in the feed.",
          },
          hideQuotePosts: {
            type: "boolean",
            description: "Hide quote posts in the feed.",
          },
          hideRepliesByLikeCount: {
            type: "integer",
            description: "Hide replies in the feed if they do not have this number of likes.",
          },
          hideRepliesByUnfollowed: {
            type: "boolean",
            default: true,
            description: "Hide replies in the feed if they are not by followed users.",
          },
        },
      },
      labelersPref: {
        type: "object",
        required: ["labelers"],
        properties: {
          labelers: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#labelerPrefItem",
              type: "ref",
            },
          },
        },
      },
      interestsPref: {
        type: "object",
        required: ["tags"],
        properties: {
          tags: {
            type: "array",
            items: {
              type: "string",
              maxLength: 640,
              maxGraphemes: 64,
            },
            maxLength: 100,
            description:
              "A list of tags which describe the account owner's interests gathered during onboarding.",
          },
        },
      },
      knownFollowers: {
        type: "object",
        required: ["count", "followers"],
        properties: {
          count: {
            type: "integer",
          },
          followers: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#profileViewBasic",
              type: "ref",
            },
            maxLength: 5,
            minLength: 0,
          },
        },
        description: "The subject's followers whom you also follow",
      },
      mutedWordsPref: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#mutedWord",
              type: "ref",
            },
            description: "A list of words the account owner has muted.",
          },
        },
      },
      savedFeedsPref: {
        type: "object",
        required: ["pinned", "saved"],
        properties: {
          saved: {
            type: "array",
            items: {
              type: "string",
              format: "at-uri",
            },
          },
          pinned: {
            type: "array",
            items: {
              type: "string",
              format: "at-uri",
            },
          },
          timelineIndex: {
            type: "integer",
          },
        },
      },
      threadViewPref: {
        type: "object",
        properties: {
          sort: {
            type: "string",
            description: "Sorting mode for threads.",
            knownValues: ["oldest", "newest", "most-likes", "random", "hotness"],
          },
        },
      },
      declaredAgePref: {
        type: "object",
        properties: {
          isOverAge13: {
            type: "boolean",
            description: "Indicates if the user has declared that they are over 13 years of age.",
          },
          isOverAge16: {
            type: "boolean",
            description: "Indicates if the user has declared that they are over 16 years of age.",
          },
          isOverAge18: {
            type: "boolean",
            description: "Indicates if the user has declared that they are over 18 years of age.",
          },
        },
        description:
          "Read-only preference containing value(s) inferred from the user's declared birthdate. Absence of this preference object in the response indicates that the user has not made a declaration.",
      },
      hiddenPostsPref: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "string",
              format: "at-uri",
            },
            description: "A list of URIs of posts the account owner has hidden.",
          },
        },
      },
      labelerPrefItem: {
        type: "object",
        required: ["did"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
        },
      },
      mutedWordTarget: {
        type: "string",
        maxLength: 640,
        knownValues: ["content", "tag"],
        maxGraphemes: 64,
      },
      adultContentPref: {
        type: "object",
        required: ["enabled"],
        properties: {
          enabled: {
            type: "boolean",
            default: false,
          },
        },
      },
      bskyAppStatePref: {
        type: "object",
        properties: {
          nuxs: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#nux",
              type: "ref",
            },
            maxLength: 100,
            description: "Storage for NUXs the user has encountered.",
          },
          queuedNudges: {
            type: "array",
            items: {
              type: "string",
              maxLength: 100,
            },
            maxLength: 1000,
            description:
              "An array of tokens which identify nudges (modals, popups, tours, highlight dots) that should be shown to the user.",
          },
          activeProgressGuide: {
            ref: "lex:app.bsky.actor.defs#bskyAppProgressGuide",
            type: "ref",
          },
        },
        description:
          "A grab bag of state that's specific to the bsky.app program. Third-party apps shouldn't use this.",
      },
      contentLabelPref: {
        type: "object",
        required: ["label", "visibility"],
        properties: {
          label: {
            type: "string",
          },
          labelerDid: {
            type: "string",
            format: "did",
            description:
              "Which labeler does this preference apply to? If undefined, applies globally.",
          },
          visibility: {
            type: "string",
            knownValues: ["ignore", "show", "warn", "hide"],
          },
        },
      },
      profileViewBasic: {
        type: "object",
        required: ["did", "handle"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          debug: {
            type: "unknown",
            description: "Debug information for internal development",
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          handle: {
            type: "string",
            format: "handle",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          status: {
            ref: "lex:app.bsky.actor.defs#statusView",
            type: "ref",
          },
          viewer: {
            ref: "lex:app.bsky.actor.defs#viewerState",
            type: "ref",
          },
          pronouns: {
            type: "string",
          },
          createdAt: {
            type: "string",
            format: "datetime",
          },
          associated: {
            ref: "lex:app.bsky.actor.defs#profileAssociated",
            type: "ref",
          },
          displayName: {
            type: "string",
            maxLength: 640,
            maxGraphemes: 64,
          },
          verification: {
            ref: "lex:app.bsky.actor.defs#verificationState",
            type: "ref",
          },
        },
      },
      savedFeedsPrefV2: {
        type: "object",
        required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#savedFeed",
              type: "ref",
            },
          },
        },
      },
      verificationView: {
        type: "object",
        required: ["issuer", "uri", "isValid", "createdAt"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
            description: "The AT-URI of the verification record.",
          },
          issuer: {
            type: "string",
            format: "did",
            description: "The user who issued this verification.",
          },
          isValid: {
            type: "boolean",
            description: "True if the verification passes validation, otherwise false.",
          },
          createdAt: {
            type: "string",
            format: "datetime",
            description: "Timestamp when the verification was created.",
          },
        },
        description: "An individual verification for an associated subject.",
      },
      profileAssociated: {
        type: "object",
        properties: {
          chat: {
            ref: "lex:app.bsky.actor.defs#profileAssociatedChat",
            type: "ref",
          },
          germ: {
            ref: "lex:app.bsky.actor.defs#profileAssociatedGerm",
            type: "ref",
          },
          lists: {
            type: "integer",
          },
          labeler: {
            type: "boolean",
          },
          feedgens: {
            type: "integer",
          },
          starterPacks: {
            type: "integer",
          },
          activitySubscription: {
            ref: "lex:app.bsky.actor.defs#profileAssociatedActivitySubscription",
            type: "ref",
          },
        },
      },
      verificationPrefs: {
        type: "object",
        required: [],
        properties: {
          hideBadges: {
            type: "boolean",
            default: false,
            description: "Hide the blue check badges for verified accounts and trusted verifiers.",
          },
        },
        description: "Preferences for how verified accounts appear in the app.",
      },
      verificationState: {
        type: "object",
        required: ["verifications", "verifiedStatus", "trustedVerifierStatus"],
        properties: {
          verifications: {
            type: "array",
            items: {
              ref: "lex:app.bsky.actor.defs#verificationView",
              type: "ref",
            },
            description:
              "All verifications issued by trusted verifiers on behalf of this user. Verifications by untrusted verifiers are not included.",
          },
          verifiedStatus: {
            type: "string",
            description: "The user's status as a verified account.",
            knownValues: ["valid", "invalid", "none"],
          },
          trustedVerifierStatus: {
            type: "string",
            description: "The user's status as a trusted verifier.",
            knownValues: ["valid", "invalid", "none"],
          },
        },
        description:
          "Represents the verification information about the user this object is attached to.",
      },
      personalDetailsPref: {
        type: "object",
        properties: {
          birthDate: {
            type: "string",
            format: "datetime",
            description: "The birth date of account owner.",
          },
        },
      },
      profileViewDetailed: {
        type: "object",
        required: ["did", "handle"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          debug: {
            type: "unknown",
            description: "Debug information for internal development",
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          banner: {
            type: "string",
            format: "uri",
          },
          handle: {
            type: "string",
            format: "handle",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          status: {
            ref: "lex:app.bsky.actor.defs#statusView",
            type: "ref",
          },
          viewer: {
            ref: "lex:app.bsky.actor.defs#viewerState",
            type: "ref",
          },
          website: {
            type: "string",
            format: "uri",
          },
          pronouns: {
            type: "string",
          },
          createdAt: {
            type: "string",
            format: "datetime",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          associated: {
            ref: "lex:app.bsky.actor.defs#profileAssociated",
            type: "ref",
          },
          pinnedPost: {
            ref: "lex:com.atproto.repo.strongRef",
            type: "ref",
          },
          postsCount: {
            type: "integer",
          },
          description: {
            type: "string",
            maxLength: 2560,
            maxGraphemes: 256,
          },
          displayName: {
            type: "string",
            maxLength: 640,
            maxGraphemes: 64,
          },
          followsCount: {
            type: "integer",
          },
          verification: {
            ref: "lex:app.bsky.actor.defs#verificationState",
            type: "ref",
          },
          followersCount: {
            type: "integer",
          },
          joinedViaStarterPack: {
            ref: "lex:app.bsky.graph.defs#starterPackViewBasic",
            type: "ref",
          },
        },
      },
      bskyAppProgressGuide: {
        type: "object",
        required: ["guide"],
        properties: {
          guide: {
            type: "string",
            maxLength: 100,
          },
        },
        description:
          "If set, an active progress guide. Once completed, can be set to undefined. Should have unspecced fields tracking progress.",
      },
      liveEventPreferences: {
        type: "object",
        properties: {
          hideAllFeeds: {
            type: "boolean",
            default: false,
            description: "Whether to hide all feeds from live events.",
          },
          hiddenFeedIds: {
            type: "array",
            items: {
              type: "string",
            },
            description: "A list of feed IDs that the user has hidden from live events.",
          },
        },
        description: "Preferences for live events.",
      },
      profileAssociatedChat: {
        type: "object",
        required: ["allowIncoming"],
        properties: {
          allowIncoming: {
            type: "string",
            knownValues: ["all", "none", "following"],
          },
        },
      },
      profileAssociatedGerm: {
        type: "object",
        required: ["showButtonTo", "messageMeUrl"],
        properties: {
          messageMeUrl: {
            type: "string",
            format: "uri",
          },
          showButtonTo: {
            type: "string",
            knownValues: ["usersIFollow", "everyone"],
          },
        },
      },
      postInteractionSettingsPref: {
        type: "object",
        required: [],
        properties: {
          threadgateAllowRules: {
            type: "array",
            items: {
              refs: [
                "lex:app.bsky.feed.threadgate#mentionRule",
                "lex:app.bsky.feed.threadgate#followerRule",
                "lex:app.bsky.feed.threadgate#followingRule",
                "lex:app.bsky.feed.threadgate#listRule",
              ],
              type: "union",
            },
            maxLength: 5,
            description:
              "Matches threadgate record. List of rules defining who can reply to this users posts. If value is an empty array, no one can reply. If value is undefined, anyone can reply.",
          },
          postgateEmbeddingRules: {
            type: "array",
            items: {
              refs: ["lex:app.bsky.feed.postgate#disableRule"],
              type: "union",
            },
            maxLength: 5,
            description:
              "Matches postgate record. List of rules defining who can embed this users posts. If value is an empty array or is undefined, no particular rules apply and anyone can embed.",
          },
        },
        description:
          "Default post interaction settings for the account. These values should be applied as default values when creating new posts. These refs should mirror the threadgate and postgate records exactly.",
      },
      profileAssociatedActivitySubscription: {
        type: "object",
        required: ["allowSubscriptions"],
        properties: {
          allowSubscriptions: {
            type: "string",
            knownValues: ["followers", "mutuals", "none"],
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyEmbedDefs: {
    id: "app.bsky.embed.defs",
    defs: {
      aspectRatio: {
        type: "object",
        required: ["width", "height"],
        properties: {
          width: {
            type: "integer",
            minimum: 1,
          },
          height: {
            type: "integer",
            minimum: 1,
          },
        },
        description:
          "width:height represents an aspect ratio. It may be approximate, and may not correspond to absolute dimensions in any given unit.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyEmbedExternal: {
    id: "app.bsky.embed.external",
    defs: {
      main: {
        type: "object",
        required: ["external"],
        properties: {
          external: {
            ref: "lex:app.bsky.embed.external#external",
            type: "ref",
          },
        },
        description:
          "A representation of some externally linked content (eg, a URL and 'card'), embedded in a Bluesky record (eg, a post).",
      },
      view: {
        type: "object",
        required: ["external"],
        properties: {
          external: {
            ref: "lex:app.bsky.embed.external#viewExternal",
            type: "ref",
          },
        },
      },
      external: {
        type: "object",
        required: ["uri", "title", "description"],
        properties: {
          uri: {
            type: "string",
            format: "uri",
          },
          thumb: {
            type: "blob",
            accept: ["image/*"],
            maxSize: 1000000,
          },
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
      },
      viewExternal: {
        type: "object",
        required: ["uri", "title", "description"],
        properties: {
          uri: {
            type: "string",
            format: "uri",
          },
          thumb: {
            type: "string",
            format: "uri",
          },
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyEmbedImages: {
    id: "app.bsky.embed.images",
    defs: {
      main: {
        type: "object",
        required: ["images"],
        properties: {
          images: {
            type: "array",
            items: {
              ref: "lex:app.bsky.embed.images#image",
              type: "ref",
            },
            maxLength: 4,
          },
        },
      },
      view: {
        type: "object",
        required: ["images"],
        properties: {
          images: {
            type: "array",
            items: {
              ref: "lex:app.bsky.embed.images#viewImage",
              type: "ref",
            },
            maxLength: 4,
          },
        },
      },
      image: {
        type: "object",
        required: ["image", "alt"],
        properties: {
          alt: {
            type: "string",
            description: "Alt text description of the image, for accessibility.",
          },
          image: {
            type: "blob",
            accept: ["image/*"],
            maxSize: 2000000,
            description: "The raw image file. May be up to 2 MB, formerly limited to 1 MB.",
          },
          aspectRatio: {
            ref: "lex:app.bsky.embed.defs#aspectRatio",
            type: "ref",
          },
        },
      },
      viewImage: {
        type: "object",
        required: ["thumb", "fullsize", "alt"],
        properties: {
          alt: {
            type: "string",
            description: "Alt text description of the image, for accessibility.",
          },
          thumb: {
            type: "string",
            format: "uri",
            description:
              "Fully-qualified URL where a thumbnail of the image can be fetched. For example, CDN location provided by the App View.",
          },
          fullsize: {
            type: "string",
            format: "uri",
            description:
              "Fully-qualified URL where a large version of the image can be fetched. May or may not be the exact original blob. For example, CDN location provided by the App View.",
          },
          aspectRatio: {
            ref: "lex:app.bsky.embed.defs#aspectRatio",
            type: "ref",
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
    description: "A set of images embedded in a Bluesky record (eg, a post).",
  },
  AppBskyEmbedRecord: {
    id: "app.bsky.embed.record",
    defs: {
      main: {
        type: "object",
        required: ["record"],
        properties: {
          record: {
            ref: "lex:com.atproto.repo.strongRef",
            type: "ref",
          },
        },
      },
      view: {
        type: "object",
        required: ["record"],
        properties: {
          record: {
            refs: [
              "lex:app.bsky.embed.record#viewRecord",
              "lex:app.bsky.embed.record#viewNotFound",
              "lex:app.bsky.embed.record#viewBlocked",
              "lex:app.bsky.embed.record#viewDetached",
              "lex:app.bsky.feed.defs#generatorView",
              "lex:app.bsky.graph.defs#listView",
              "lex:app.bsky.labeler.defs#labelerView",
              "lex:app.bsky.graph.defs#starterPackViewBasic",
            ],
            type: "union",
          },
        },
      },
      viewRecord: {
        type: "object",
        required: ["uri", "cid", "author", "value", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          value: {
            type: "unknown",
            description: "The record data itself.",
          },
          author: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
          },
          embeds: {
            type: "array",
            items: {
              refs: [
                "lex:app.bsky.embed.images#view",
                "lex:app.bsky.embed.video#view",
                "lex:app.bsky.embed.external#view",
                "lex:app.bsky.embed.record#view",
                "lex:app.bsky.embed.recordWithMedia#view",
              ],
              type: "union",
            },
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          likeCount: {
            type: "integer",
          },
          quoteCount: {
            type: "integer",
          },
          replyCount: {
            type: "integer",
          },
          repostCount: {
            type: "integer",
          },
        },
      },
      viewBlocked: {
        type: "object",
        required: ["uri", "blocked", "author"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          author: {
            ref: "lex:app.bsky.feed.defs#blockedAuthor",
            type: "ref",
          },
          blocked: {
            type: "boolean",
            const: true,
          },
        },
      },
      viewDetached: {
        type: "object",
        required: ["uri", "detached"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          detached: {
            type: "boolean",
            const: true,
          },
        },
      },
      viewNotFound: {
        type: "object",
        required: ["uri", "notFound"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          notFound: {
            type: "boolean",
            const: true,
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
    description:
      "A representation of a record embedded in a Bluesky record (eg, a post). For example, a quote-post, or sharing a feed generator record.",
  },
  AppBskyEmbedRecordWithMedia: {
    id: "app.bsky.embed.recordWithMedia",
    defs: {
      main: {
        type: "object",
        required: ["record", "media"],
        properties: {
          media: {
            refs: [
              "lex:app.bsky.embed.images",
              "lex:app.bsky.embed.video",
              "lex:app.bsky.embed.external",
            ],
            type: "union",
          },
          record: {
            ref: "lex:app.bsky.embed.record",
            type: "ref",
          },
        },
      },
      view: {
        type: "object",
        required: ["record", "media"],
        properties: {
          media: {
            refs: [
              "lex:app.bsky.embed.images#view",
              "lex:app.bsky.embed.video#view",
              "lex:app.bsky.embed.external#view",
            ],
            type: "union",
          },
          record: {
            ref: "lex:app.bsky.embed.record#view",
            type: "ref",
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
    description:
      "A representation of a record embedded in a Bluesky record (eg, a post), alongside other compatible embeds. For example, a quote post and image, or a quote post and external URL card.",
  },
  AppBskyEmbedVideo: {
    id: "app.bsky.embed.video",
    defs: {
      main: {
        type: "object",
        required: ["video"],
        properties: {
          alt: {
            type: "string",
            maxLength: 10000,
            description: "Alt text description of the video, for accessibility.",
            maxGraphemes: 1000,
          },
          video: {
            type: "blob",
            accept: ["video/mp4"],
            maxSize: 100000000,
            description: "The mp4 video file. May be up to 100mb, formerly limited to 50mb.",
          },
          captions: {
            type: "array",
            items: {
              ref: "lex:app.bsky.embed.video#caption",
              type: "ref",
            },
            maxLength: 20,
          },
          aspectRatio: {
            ref: "lex:app.bsky.embed.defs#aspectRatio",
            type: "ref",
          },
          presentation: {
            type: "string",
            description: "A hint to the client about how to present the video.",
            knownValues: ["default", "gif"],
          },
        },
      },
      view: {
        type: "object",
        required: ["cid", "playlist"],
        properties: {
          alt: {
            type: "string",
            maxLength: 10000,
            maxGraphemes: 1000,
          },
          cid: {
            type: "string",
            format: "cid",
          },
          playlist: {
            type: "string",
            format: "uri",
          },
          thumbnail: {
            type: "string",
            format: "uri",
          },
          aspectRatio: {
            ref: "lex:app.bsky.embed.defs#aspectRatio",
            type: "ref",
          },
          presentation: {
            type: "string",
            description: "A hint to the client about how to present the video.",
            knownValues: ["default", "gif"],
          },
        },
      },
      caption: {
        type: "object",
        required: ["lang", "file"],
        properties: {
          file: {
            type: "blob",
            accept: ["text/vtt"],
            maxSize: 20000,
          },
          lang: {
            type: "string",
            format: "language",
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
    description: "A video embedded in a Bluesky record (eg, a post).",
  },
  AppBskyFeedDefs: {
    id: "app.bsky.feed.defs",
    defs: {
      postView: {
        type: "object",
        required: ["uri", "cid", "author", "record", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          debug: {
            type: "unknown",
            description: "Debug information for internal development",
          },
          embed: {
            refs: [
              "lex:app.bsky.embed.images#view",
              "lex:app.bsky.embed.video#view",
              "lex:app.bsky.embed.external#view",
              "lex:app.bsky.embed.record#view",
              "lex:app.bsky.embed.recordWithMedia#view",
            ],
            type: "union",
          },
          author: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          record: {
            type: "unknown",
          },
          viewer: {
            ref: "lex:app.bsky.feed.defs#viewerState",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          likeCount: {
            type: "integer",
          },
          quoteCount: {
            type: "integer",
          },
          replyCount: {
            type: "integer",
          },
          threadgate: {
            ref: "lex:app.bsky.feed.defs#threadgateView",
            type: "ref",
          },
          repostCount: {
            type: "integer",
          },
          bookmarkCount: {
            type: "integer",
          },
        },
      },
      replyRef: {
        type: "object",
        required: ["root", "parent"],
        properties: {
          root: {
            refs: [
              "lex:app.bsky.feed.defs#postView",
              "lex:app.bsky.feed.defs#notFoundPost",
              "lex:app.bsky.feed.defs#blockedPost",
            ],
            type: "union",
          },
          parent: {
            refs: [
              "lex:app.bsky.feed.defs#postView",
              "lex:app.bsky.feed.defs#notFoundPost",
              "lex:app.bsky.feed.defs#blockedPost",
            ],
            type: "union",
          },
          grandparentAuthor: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
            description: "When parent is a reply to another post, this is the author of that post.",
          },
        },
      },
      reasonPin: {
        type: "object",
        properties: {},
      },
      blockedPost: {
        type: "object",
        required: ["uri", "blocked", "author"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          author: {
            ref: "lex:app.bsky.feed.defs#blockedAuthor",
            type: "ref",
          },
          blocked: {
            type: "boolean",
            const: true,
          },
        },
      },
      interaction: {
        type: "object",
        properties: {
          item: {
            type: "string",
            format: "at-uri",
          },
          event: {
            type: "string",
            knownValues: [
              "app.bsky.feed.defs#requestLess",
              "app.bsky.feed.defs#requestMore",
              "app.bsky.feed.defs#clickthroughItem",
              "app.bsky.feed.defs#clickthroughAuthor",
              "app.bsky.feed.defs#clickthroughReposter",
              "app.bsky.feed.defs#clickthroughEmbed",
              "app.bsky.feed.defs#interactionSeen",
              "app.bsky.feed.defs#interactionLike",
              "app.bsky.feed.defs#interactionRepost",
              "app.bsky.feed.defs#interactionReply",
              "app.bsky.feed.defs#interactionQuote",
              "app.bsky.feed.defs#interactionShare",
            ],
          },
          reqId: {
            type: "string",
            maxLength: 100,
            description:
              "Unique identifier per request that may be passed back alongside interactions.",
          },
          feedContext: {
            type: "string",
            maxLength: 2000,
            description:
              "Context on a feed item that was originally supplied by the feed generator on getFeedSkeleton.",
          },
        },
      },
      requestLess: {
        type: "token",
        description: "Request that less content like the given feed item be shown in the feed",
      },
      requestMore: {
        type: "token",
        description: "Request that more content like the given feed item be shown in the feed",
      },
      viewerState: {
        type: "object",
        properties: {
          like: {
            type: "string",
            format: "at-uri",
          },
          pinned: {
            type: "boolean",
          },
          repost: {
            type: "string",
            format: "at-uri",
          },
          bookmarked: {
            type: "boolean",
          },
          threadMuted: {
            type: "boolean",
          },
          replyDisabled: {
            type: "boolean",
          },
          embeddingDisabled: {
            type: "boolean",
          },
        },
        description:
          "Metadata about the requesting account's relationship with the subject content. Only has meaningful content for authed requests.",
      },
      feedViewPost: {
        type: "object",
        required: ["post"],
        properties: {
          post: {
            ref: "lex:app.bsky.feed.defs#postView",
            type: "ref",
          },
          reply: {
            ref: "lex:app.bsky.feed.defs#replyRef",
            type: "ref",
          },
          reqId: {
            type: "string",
            maxLength: 100,
            description:
              "Unique identifier per request that may be passed back alongside interactions.",
          },
          reason: {
            refs: ["lex:app.bsky.feed.defs#reasonRepost", "lex:app.bsky.feed.defs#reasonPin"],
            type: "union",
          },
          feedContext: {
            type: "string",
            maxLength: 2000,
            description:
              "Context provided by feed generator that may be passed back alongside interactions.",
          },
        },
      },
      notFoundPost: {
        type: "object",
        required: ["uri", "notFound"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          notFound: {
            type: "boolean",
            const: true,
          },
        },
      },
      reasonRepost: {
        type: "object",
        required: ["by", "indexedAt"],
        properties: {
          by: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
          },
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
        },
      },
      blockedAuthor: {
        type: "object",
        required: ["did"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          viewer: {
            ref: "lex:app.bsky.actor.defs#viewerState",
            type: "ref",
          },
        },
      },
      generatorView: {
        type: "object",
        required: ["uri", "cid", "did", "creator", "displayName", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          did: {
            type: "string",
            format: "did",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          viewer: {
            ref: "lex:app.bsky.feed.defs#generatorViewerState",
            type: "ref",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileView",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          likeCount: {
            type: "integer",
            minimum: 0,
          },
          contentMode: {
            type: "string",
            knownValues: [
              "app.bsky.feed.defs#contentModeUnspecified",
              "app.bsky.feed.defs#contentModeVideo",
            ],
          },
          description: {
            type: "string",
            maxLength: 3000,
            maxGraphemes: 300,
          },
          displayName: {
            type: "string",
          },
          descriptionFacets: {
            type: "array",
            items: {
              ref: "lex:app.bsky.richtext.facet",
              type: "ref",
            },
          },
          acceptsInteractions: {
            type: "boolean",
          },
        },
      },
      threadContext: {
        type: "object",
        properties: {
          rootAuthorLike: {
            type: "string",
            format: "at-uri",
          },
        },
        description: "Metadata about this post within the context of the thread it is in.",
      },
      threadViewPost: {
        type: "object",
        required: ["post"],
        properties: {
          post: {
            ref: "lex:app.bsky.feed.defs#postView",
            type: "ref",
          },
          parent: {
            refs: [
              "lex:app.bsky.feed.defs#threadViewPost",
              "lex:app.bsky.feed.defs#notFoundPost",
              "lex:app.bsky.feed.defs#blockedPost",
            ],
            type: "union",
          },
          replies: {
            type: "array",
            items: {
              refs: [
                "lex:app.bsky.feed.defs#threadViewPost",
                "lex:app.bsky.feed.defs#notFoundPost",
                "lex:app.bsky.feed.defs#blockedPost",
              ],
              type: "union",
            },
          },
          threadContext: {
            ref: "lex:app.bsky.feed.defs#threadContext",
            type: "ref",
          },
        },
      },
      threadgateView: {
        type: "object",
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          lists: {
            type: "array",
            items: {
              ref: "lex:app.bsky.graph.defs#listViewBasic",
              type: "ref",
            },
          },
          record: {
            type: "unknown",
          },
        },
      },
      interactionLike: {
        type: "token",
        description: "User liked the feed item",
      },
      interactionSeen: {
        type: "token",
        description: "Feed item was seen by user",
      },
      clickthroughItem: {
        type: "token",
        description: "User clicked through to the feed item",
      },
      contentModeVideo: {
        type: "token",
        description:
          "Declares the feed generator returns posts containing app.bsky.embed.video embeds.",
      },
      interactionQuote: {
        type: "token",
        description: "User quoted the feed item",
      },
      interactionReply: {
        type: "token",
        description: "User replied to the feed item",
      },
      interactionShare: {
        type: "token",
        description: "User shared the feed item",
      },
      skeletonFeedPost: {
        type: "object",
        required: ["post"],
        properties: {
          post: {
            type: "string",
            format: "at-uri",
          },
          reason: {
            refs: [
              "lex:app.bsky.feed.defs#skeletonReasonRepost",
              "lex:app.bsky.feed.defs#skeletonReasonPin",
            ],
            type: "union",
          },
          feedContext: {
            type: "string",
            maxLength: 2000,
            description:
              "Context that will be passed through to client and may be passed to feed generator back alongside interactions.",
          },
        },
      },
      clickthroughEmbed: {
        type: "token",
        description: "User clicked through to the embedded content of the feed item",
      },
      interactionRepost: {
        type: "token",
        description: "User reposted the feed item",
      },
      skeletonReasonPin: {
        type: "object",
        properties: {},
      },
      clickthroughAuthor: {
        type: "token",
        description: "User clicked through to the author of the feed item",
      },
      clickthroughReposter: {
        type: "token",
        description: "User clicked through to the reposter of the feed item",
      },
      generatorViewerState: {
        type: "object",
        properties: {
          like: {
            type: "string",
            format: "at-uri",
          },
        },
      },
      skeletonReasonRepost: {
        type: "object",
        required: ["repost"],
        properties: {
          repost: {
            type: "string",
            format: "at-uri",
          },
        },
      },
      contentModeUnspecified: {
        type: "token",
        description: "Declares the feed generator returns any types of posts.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyFeedPostgate: {
    id: "app.bsky.feed.postgate",
    defs: {
      main: {
        key: "tid",
        type: "record",
        record: {
          type: "object",
          required: ["post", "createdAt"],
          properties: {
            post: {
              type: "string",
              format: "at-uri",
              description: "Reference (AT-URI) to the post record.",
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
            embeddingRules: {
              type: "array",
              items: {
                refs: ["lex:app.bsky.feed.postgate#disableRule"],
                type: "union",
              },
              maxLength: 5,
              description:
                "List of rules defining who can embed this post. If value is an empty array or is undefined, no particular rules apply and anyone can embed.",
            },
            detachedEmbeddingUris: {
              type: "array",
              items: {
                type: "string",
                format: "at-uri",
              },
              maxLength: 50,
              description: "List of AT-URIs embedding this post that the author has detached from.",
            },
          },
        },
        description:
          "Record defining interaction rules for a post. The record key (rkey) of the postgate record must match the record key of the post, and that record must be in the same repository.",
      },
      disableRule: {
        type: "object",
        properties: {},
        description: "Disables embedding of this post.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyFeedThreadgate: {
    id: "app.bsky.feed.threadgate",
    defs: {
      main: {
        key: "tid",
        type: "record",
        record: {
          type: "object",
          required: ["post", "createdAt"],
          properties: {
            post: {
              type: "string",
              format: "at-uri",
              description: "Reference (AT-URI) to the post record.",
            },
            allow: {
              type: "array",
              items: {
                refs: [
                  "lex:app.bsky.feed.threadgate#mentionRule",
                  "lex:app.bsky.feed.threadgate#followerRule",
                  "lex:app.bsky.feed.threadgate#followingRule",
                  "lex:app.bsky.feed.threadgate#listRule",
                ],
                type: "union",
              },
              maxLength: 5,
              description:
                "List of rules defining who can reply to this post. If value is an empty array, no one can reply. If value is undefined, anyone can reply.",
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
            hiddenReplies: {
              type: "array",
              items: {
                type: "string",
                format: "at-uri",
              },
              maxLength: 300,
              description: "List of hidden reply URIs.",
            },
          },
        },
        description:
          "Record defining interaction gating rules for a thread (aka, reply controls). The record key (rkey) of the threadgate record must match the record key of the thread's root post, and that record must be in the same repository.",
      },
      listRule: {
        type: "object",
        required: ["list"],
        properties: {
          list: {
            type: "string",
            format: "at-uri",
          },
        },
        description: "Allow replies from actors on a list.",
      },
      mentionRule: {
        type: "object",
        properties: {},
        description: "Allow replies from actors mentioned in your post.",
      },
      followerRule: {
        type: "object",
        properties: {},
        description: "Allow replies from actors who follow you.",
      },
      followingRule: {
        type: "object",
        properties: {},
        description: "Allow replies from actors you follow.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyGraphDefs: {
    id: "app.bsky.graph.defs",
    defs: {
      modlist: {
        type: "token",
        description: "A list of actors to apply an aggregate moderation action (mute/block) on.",
      },
      listView: {
        type: "object",
        required: ["uri", "cid", "creator", "name", "purpose", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          name: {
            type: "string",
            maxLength: 64,
            minLength: 1,
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          viewer: {
            ref: "lex:app.bsky.graph.defs#listViewerState",
            type: "ref",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileView",
            type: "ref",
          },
          purpose: {
            ref: "lex:app.bsky.graph.defs#listPurpose",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          description: {
            type: "string",
            maxLength: 3000,
            maxGraphemes: 300,
          },
          listItemCount: {
            type: "integer",
            minimum: 0,
          },
          descriptionFacets: {
            type: "array",
            items: {
              ref: "lex:app.bsky.richtext.facet",
              type: "ref",
            },
          },
        },
      },
      curatelist: {
        type: "token",
        description:
          "A list of actors used for curation purposes such as list feeds or interaction gating.",
      },
      listPurpose: {
        type: "string",
        knownValues: [
          "app.bsky.graph.defs#modlist",
          "app.bsky.graph.defs#curatelist",
          "app.bsky.graph.defs#referencelist",
        ],
      },
      listItemView: {
        type: "object",
        required: ["uri", "subject"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          subject: {
            ref: "lex:app.bsky.actor.defs#profileView",
            type: "ref",
          },
        },
      },
      relationship: {
        type: "object",
        required: ["did"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          blocking: {
            type: "string",
            format: "at-uri",
            description: "if the actor blocks this DID, this is the AT-URI of the block record",
          },
          blockedBy: {
            type: "string",
            format: "at-uri",
            description:
              "if the actor is blocked by this DID, contains the AT-URI of the block record",
          },
          following: {
            type: "string",
            format: "at-uri",
            description: "if the actor follows this DID, this is the AT-URI of the follow record",
          },
          followedBy: {
            type: "string",
            format: "at-uri",
            description:
              "if the actor is followed by this DID, contains the AT-URI of the follow record",
          },
          blockedByList: {
            type: "string",
            format: "at-uri",
            description:
              "if the actor is blocked by this DID via a block list, contains the AT-URI of the listblock record",
          },
          blockingByList: {
            type: "string",
            format: "at-uri",
            description:
              "if the actor blocks this DID via a block list, this is the AT-URI of the listblock record",
          },
        },
        description:
          "lists the bi-directional graph relationships between one actor (not indicated in the object), and the target actors (the DID included in the object)",
      },
      listViewBasic: {
        type: "object",
        required: ["uri", "cid", "name", "purpose"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          name: {
            type: "string",
            maxLength: 64,
            minLength: 1,
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          viewer: {
            ref: "lex:app.bsky.graph.defs#listViewerState",
            type: "ref",
          },
          purpose: {
            ref: "lex:app.bsky.graph.defs#listPurpose",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          listItemCount: {
            type: "integer",
            minimum: 0,
          },
        },
      },
      notFoundActor: {
        type: "object",
        required: ["actor", "notFound"],
        properties: {
          actor: {
            type: "string",
            format: "at-identifier",
          },
          notFound: {
            type: "boolean",
            const: true,
          },
        },
        description: "indicates that a handle or DID could not be resolved",
      },
      referencelist: {
        type: "token",
        description:
          "A list of actors used for only for reference purposes such as within a starter pack.",
      },
      listViewerState: {
        type: "object",
        properties: {
          muted: {
            type: "boolean",
          },
          blocked: {
            type: "string",
            format: "at-uri",
          },
        },
      },
      starterPackView: {
        type: "object",
        required: ["uri", "cid", "record", "creator", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          list: {
            ref: "lex:app.bsky.graph.defs#listViewBasic",
            type: "ref",
          },
          feeds: {
            type: "array",
            items: {
              ref: "lex:app.bsky.feed.defs#generatorView",
              type: "ref",
            },
            maxLength: 3,
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          record: {
            type: "unknown",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          joinedWeekCount: {
            type: "integer",
            minimum: 0,
          },
          listItemsSample: {
            type: "array",
            items: {
              ref: "lex:app.bsky.graph.defs#listItemView",
              type: "ref",
            },
            maxLength: 12,
          },
          joinedAllTimeCount: {
            type: "integer",
            minimum: 0,
          },
        },
      },
      starterPackViewBasic: {
        type: "object",
        required: ["uri", "cid", "record", "creator", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          record: {
            type: "unknown",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          listItemCount: {
            type: "integer",
            minimum: 0,
          },
          joinedWeekCount: {
            type: "integer",
            minimum: 0,
          },
          joinedAllTimeCount: {
            type: "integer",
            minimum: 0,
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyLabelerDefs: {
    id: "app.bsky.labeler.defs",
    defs: {
      labelerView: {
        type: "object",
        required: ["uri", "cid", "creator", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          viewer: {
            ref: "lex:app.bsky.labeler.defs#labelerViewerState",
            type: "ref",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileView",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          likeCount: {
            type: "integer",
            minimum: 0,
          },
        },
      },
      labelerPolicies: {
        type: "object",
        required: ["labelValues"],
        properties: {
          labelValues: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#labelValue",
              type: "ref",
            },
            description:
              "The label values which this labeler publishes. May include global or custom labels.",
          },
          labelValueDefinitions: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#labelValueDefinition",
              type: "ref",
            },
            description:
              "Label values created by this labeler and scoped exclusively to it. Labels defined here will override global label definitions for this labeler.",
          },
        },
      },
      labelerViewerState: {
        type: "object",
        properties: {
          like: {
            type: "string",
            format: "at-uri",
          },
        },
      },
      labelerViewDetailed: {
        type: "object",
        required: ["uri", "cid", "creator", "policies", "indexedAt"],
        properties: {
          cid: {
            type: "string",
            format: "cid",
          },
          uri: {
            type: "string",
            format: "at-uri",
          },
          labels: {
            type: "array",
            items: {
              ref: "lex:com.atproto.label.defs#label",
              type: "ref",
            },
          },
          viewer: {
            ref: "lex:app.bsky.labeler.defs#labelerViewerState",
            type: "ref",
          },
          creator: {
            ref: "lex:app.bsky.actor.defs#profileView",
            type: "ref",
          },
          policies: {
            ref: "lex:app.bsky.labeler.defs#labelerPolicies",
            type: "ref",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
          likeCount: {
            type: "integer",
            minimum: 0,
          },
          reasonTypes: {
            type: "array",
            items: {
              ref: "lex:com.atproto.moderation.defs#reasonType",
              type: "ref",
            },
            description:
              "The set of report reason 'codes' which are in-scope for this service to review and action. These usually align to policy categories. If not defined (distinct from empty array), all reason types are allowed.",
          },
          subjectTypes: {
            type: "array",
            items: {
              ref: "lex:com.atproto.moderation.defs#subjectType",
              type: "ref",
            },
            description:
              "The set of subject types (account, record, etc) this service accepts reports on.",
          },
          subjectCollections: {
            type: "array",
            items: {
              type: "string",
              format: "nsid",
            },
            description:
              "Set of record types (collection NSIDs) which can be reported to this service. If not defined (distinct from empty array), default is any record type.",
          },
        },
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyNotificationDefs: {
    id: "app.bsky.notification.defs",
    defs: {
      preference: {
        type: "object",
        required: ["list", "push"],
        properties: {
          list: {
            type: "boolean",
          },
          push: {
            type: "boolean",
          },
        },
      },
      preferences: {
        type: "object",
        required: [
          "chat",
          "follow",
          "like",
          "likeViaRepost",
          "mention",
          "quote",
          "reply",
          "repost",
          "repostViaRepost",
          "starterpackJoined",
          "subscribedPost",
          "unverified",
          "verified",
        ],
        properties: {
          chat: {
            ref: "lex:app.bsky.notification.defs#chatPreference",
            type: "ref",
          },
          like: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          quote: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          reply: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          follow: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          repost: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          mention: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          verified: {
            ref: "lex:app.bsky.notification.defs#preference",
            type: "ref",
          },
          unverified: {
            ref: "lex:app.bsky.notification.defs#preference",
            type: "ref",
          },
          likeViaRepost: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          subscribedPost: {
            ref: "lex:app.bsky.notification.defs#preference",
            type: "ref",
          },
          repostViaRepost: {
            ref: "lex:app.bsky.notification.defs#filterablePreference",
            type: "ref",
          },
          starterpackJoined: {
            ref: "lex:app.bsky.notification.defs#preference",
            type: "ref",
          },
        },
      },
      recordDeleted: {
        type: "object",
        properties: {},
      },
      chatPreference: {
        type: "object",
        required: ["include", "push"],
        properties: {
          push: {
            type: "boolean",
          },
          include: {
            type: "string",
            knownValues: ["all", "accepted"],
          },
        },
      },
      activitySubscription: {
        type: "object",
        required: ["post", "reply"],
        properties: {
          post: {
            type: "boolean",
          },
          reply: {
            type: "boolean",
          },
        },
      },
      filterablePreference: {
        type: "object",
        required: ["include", "list", "push"],
        properties: {
          list: {
            type: "boolean",
          },
          push: {
            type: "boolean",
          },
          include: {
            type: "string",
            knownValues: ["all", "follows"],
          },
        },
      },
      subjectActivitySubscription: {
        type: "object",
        required: ["subject", "activitySubscription"],
        properties: {
          subject: {
            type: "string",
            format: "did",
          },
          activitySubscription: {
            ref: "lex:app.bsky.notification.defs#activitySubscription",
            type: "ref",
          },
        },
        description: "Object used to store activity subscription data in stash.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  AppBskyRichtextFacet: {
    id: "app.bsky.richtext.facet",
    defs: {
      tag: {
        type: "object",
        required: ["tag"],
        properties: {
          tag: {
            type: "string",
            maxLength: 640,
            maxGraphemes: 64,
          },
        },
        description:
          "Facet feature for a hashtag. The text usually includes a '#' prefix, but the facet reference should not (except in the case of 'double hash tags').",
      },
      link: {
        type: "object",
        required: ["uri"],
        properties: {
          uri: {
            type: "string",
            format: "uri",
          },
        },
        description:
          "Facet feature for a URL. The text URL may have been simplified or truncated, but the facet reference should be a complete URL.",
      },
      main: {
        type: "object",
        required: ["index", "features"],
        properties: {
          index: {
            ref: "lex:app.bsky.richtext.facet#byteSlice",
            type: "ref",
          },
          features: {
            type: "array",
            items: {
              refs: [
                "lex:app.bsky.richtext.facet#mention",
                "lex:app.bsky.richtext.facet#link",
                "lex:app.bsky.richtext.facet#tag",
              ],
              type: "union",
            },
          },
        },
        description: "Annotation of a sub-string within rich text.",
      },
      mention: {
        type: "object",
        required: ["did"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
        },
        description:
          "Facet feature for mention of another account. The text is usually a handle, including a '@' prefix, but the facet reference is a DID.",
      },
      byteSlice: {
        type: "object",
        required: ["byteStart", "byteEnd"],
        properties: {
          byteEnd: {
            type: "integer",
            minimum: 0,
          },
          byteStart: {
            type: "integer",
            minimum: 0,
          },
        },
        description:
          "Specifies the sub-string range a facet feature applies to. Start index is inclusive, end index is exclusive. Indices are zero-indexed, counting bytes of the UTF-8 encoded text. NOTE: some languages, like Javascript, use UTF-16 or Unicode codepoints for string slice indexing; in these languages, convert to byte arrays before working with facets.",
      },
    },
    $type: "com.atproto.lexicon.schema",
    lexicon: 1,
  },
  BlueMojiCollectionDefs: {
    lexicon: 1,
    id: "blue.moji.collection.defs",
    defs: {
      collectionView: {
        type: "object",
        required: ["uri", "cid", "creator", "name", "indexedAt"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          cid: {
            type: "string",
            format: "cid",
          },
          creator: {
            type: "ref",
            ref: "lex:app.bsky.actor.defs#profileView",
          },
          name: {
            type: "string",
            maxLength: 64,
            minLength: 1,
          },
          description: {
            type: "string",
            maxGraphemes: 300,
            maxLength: 3000,
          },
          descriptionFacets: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:app.bsky.richtext.facet",
            },
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          collectionItemCount: {
            type: "integer",
            minimum: 0,
          },
          labels: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#label",
            },
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
        },
      },
    },
  },
  BlueMojiCollectionGetItem: {
    lexicon: 1,
    id: "blue.moji.collection.getItem",
    defs: {
      main: {
        type: "query",
        description: "Get a single emoji from a repository. Requires auth.",
        parameters: {
          type: "params",
          required: ["repo", "name"],
          properties: {
            repo: {
              type: "string",
              format: "at-identifier",
              description: "The handle or DID of the repo.",
            },
            name: {
              type: "string",
              description: "The Bluemoji alias/rkey.",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["uri", "item"],
            properties: {
              uri: {
                type: "string",
                format: "at-uri",
              },
              item: {
                type: "ref",
                ref: "lex:blue.moji.collection.item#itemView",
              },
            },
          },
        },
      },
    },
  },
  BlueMojiCollectionItem: {
    lexicon: 1,
    id: "blue.moji.collection.item",
    defs: {
      main: {
        type: "record",
        description:
          "A custom emoji. The record key is the canonical alias for ASCII aliases, or its RFC 3492 Punycode encoding (xn-- prefixed) for internationalised aliases; see Bluemoji RFC 0005.",
        key: "any",
        record: {
          type: "object",
          required: ["name", "createdAt", "formats"],
          properties: {
            name: {
              type: "string",
              description: "Should be in the format :emoji:",
            },
            alt: {
              type: "string",
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
            formats: {
              type: "union",
              description:
                "Open union to allow for future formats. #formats_v0 is deprecated: writers MUST write #formats_v1 (see RFC 0001 Adoption strategy / RFC 0005). Readers SHOULD continue to accept #formats_v0 for historical records.",
              refs: [
                "lex:blue.moji.collection.item#formats_v0",
                "lex:blue.moji.collection.item#formats_v1",
              ],
              closed: false,
            },
            stickerFormats: {
              type: "union",
              description:
                "Optional full-size renditions for use as a sticker (post attachment via blue.moji.embed.sticker). Presence of this field marks the item as sticker-capable; items with only 'formats' are inline emoji.",
              refs: ["lex:blue.moji.collection.item#stickerFormats_v0"],
              closed: false,
            },
            adultOnly: {
              type: "boolean",
              default: false,
            },
            labels: {
              type: "union",
              description: "Self-label values for this emoji. Effectively content warnings.",
              refs: ["lex:com.atproto.label.defs#selfLabels"],
            },
            copyOf: {
              type: "string",
              format: "at-uri",
            },
            fallbackText: {
              type: "string",
              maxLength: 1,
              default: "◌",
            },
          },
        },
      },
      formats_v0: {
        type: "object",
        description:
          "DEPRECATED. apng_128/lottie are raw Bytes (not Blob), which makes them invisible to blob-based image moderation pipelines and requires a getRecord round-trip to render. New writes MUST use #formats_v1. Retained only so existing v0 records remain readable.",
        properties: {
          original: {
            type: "blob",
            accept: ["image/*", "application/lottie+zip"],
            maxSize: 1000000,
          },
          png_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v0",
          },
          apng_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#bytes_v0",
          },
          gif_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v0",
          },
          webp_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v0",
          },
          lottie: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#bytes_v0",
          },
        },
      },
      formats_v1: {
        type: "object",
        properties: {
          original: {
            type: "blob",
            accept: ["image/*", "application/lottie+zip"],
            maxSize: 1000000,
          },
          png_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v1",
          },
          apng_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v1",
          },
          gif_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v1",
          },
          webp_128: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v1",
          },
          lottie: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_v1",
          },
        },
      },
      stickerFormats_v0: {
        type: "object",
        description:
          "Full-size (up to 512×512) renditions for sharing as a sticker. Raster formats should be exactly 512px on the longest edge.",
        properties: {
          png_512: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_sticker",
          },
          webp_512: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_sticker",
          },
          gif_512: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_sticker",
          },
          apng_512: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_sticker",
          },
          lottie: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#blob_sticker",
          },
        },
      },
      blob_sticker: {
        type: "blob",
        maxSize: 512000,
        description:
          "Stickers render one-per-post at full size, so a larger budget than inline emoji is acceptable.",
      },
      blob_v1: {
        type: "blob",
        maxSize: 128000,
        description:
          "Limiting blobs to 128kb because there may be many on page and these get optimised by ImgProxy anyway",
      },
      blob_v0: {
        type: "blob",
        maxSize: 262144,
        description:
          "Limiting blobs to 256kb because there may be many on page and these get optimised by ImgProxy anyway",
      },
      bytes_v0: {
        type: "bytes",
        maxLength: 65536,
        description: "64kb should be enough for anybody",
      },
      itemView: {
        type: "object",
        required: ["name", "formats"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
            description:
              "AT-URI of the source item record. Views need this so consumers can derive the owning DID for blob URL construction.",
          },
          cid: {
            type: "string",
            format: "cid",
            description:
              "CID of the source item record, so consumers can build a com.atproto.repo.strongRef to it (e.g. for moderation reports) without a separate lookup.",
          },
          did: {
            type: "string",
            format: "did",
            description: "DID of the repo that owns this item's blobs.",
          },
          name: {
            type: "string",
          },
          alt: {
            type: "string",
          },
          createdAt: {
            type: "string",
            format: "datetime",
          },
          formats: {
            type: "union",
            refs: [
              "lex:blue.moji.collection.item#formats_v0",
              "lex:blue.moji.collection.item#formats_v1",
            ],
          },
          stickerFormats: {
            type: "union",
            refs: ["lex:blue.moji.collection.item#stickerFormats_v0"],
            closed: false,
          },
          adultOnly: {
            type: "boolean",
            default: false,
          },
          copyOf: {
            type: "string",
            format: "at-uri",
            description:
              "AT-URI of the item this was directly copied from, mirroring the record's own copyOf field.",
          },
          originalCreator: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#originalCreator",
            description:
              "The account at the root of this item's copyOf chain (walked server-side, since a copy can itself be copied), if this item is a copy at all. Omitted for original items. If a link in the chain is missing (e.g. a source account deleted its copy), resolves to whatever the chain reaches rather than failing outright.",
          },
        },
      },
      originalCreator: {
        type: "object",
        required: ["did", "handle"],
        properties: {
          did: {
            type: "string",
            format: "did",
          },
          handle: {
            type: "string",
          },
        },
      },
    },
  },
  BlueMojiCollectionListCollection: {
    lexicon: 1,
    id: "blue.moji.collection.listCollection",
    defs: {
      main: {
        type: "query",
        description:
          "List a range of Bluemoji in a repository. Public read: pass 'repo' to browse any repo's collection. If 'repo' is omitted, the caller must be authenticated and their own collection is listed.",
        parameters: {
          type: "params",
          properties: {
            repo: {
              type: "string",
              format: "at-identifier",
              description:
                "The handle or DID of the repo to list. Defaults to the authenticated caller if omitted.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50,
              description: "The number of records to return.",
            },
            cursor: {
              type: "string",
            },
            reverse: {
              type: "boolean",
              description:
                "Flag to reverse the order of the returned records. Default is oldest-first (ascending by creation time), mirroring com.atproto.repo.listRecords.",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["items"],
            properties: {
              cursor: {
                type: "string",
              },
              items: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.collection.item#itemView",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiCollectionPutItem: {
    lexicon: 1,
    id: "blue.moji.collection.putItem",
    defs: {
      main: {
        type: "procedure",
        description:
          "Write a Bluemoji record, creating or updating it as needed. Requires auth, implemented by AppView.",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["repo", "item"],
            properties: {
              repo: {
                type: "string",
                format: "at-identifier",
                description: "The handle or DID of the repo (aka, current account).",
              },
              validate: {
                type: "boolean",
                default: true,
                description:
                  "Can be set to 'false' to skip Lexicon schema validation of record data.",
              },
              item: {
                type: "ref",
                ref: "lex:blue.moji.collection.item#itemView",
              },
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["uri"],
            properties: {
              uri: {
                type: "string",
                format: "at-uri",
              },
            },
          },
        },
        errors: [],
      },
    },
  },
  BlueMojiCollectionSaveToCollection: {
    lexicon: 1,
    id: "blue.moji.collection.saveToCollection",
    defs: {
      main: {
        type: "procedure",
        description: "Copy a single emoji from another repo. Requires auth.",
        input: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["source", "name"],
            properties: {
              source: {
                type: "string",
                format: "at-identifier",
                description: "The handle or DID of the repo to copy from.",
              },
              name: {
                type: "string",
                description:
                  "The source Bluemoji alias or rkey. Internationalised aliases are accepted and encoded per RFC 0005.",
                maxLength: 512,
              },
              renameTo: {
                type: "string",
                description:
                  "The alias to save the Bluemoji to in the current logged-in user's repo.",
              },
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["uri", "item"],
            properties: {
              uri: {
                type: "string",
                format: "at-uri",
              },
              item: {
                type: "ref",
                ref: "lex:blue.moji.collection.item#itemView",
              },
            },
          },
        },
        errors: [
          {
            name: "EmojiNotFound",
            description: "Indicates the named Bluemoji was not found in the source repo.",
          },
          {
            name: "DestinationExists",
            description:
              "Indicates another Bluemoji with the same name already exists in the source repo. Set renameTo to rename.",
          },
        ],
      },
    },
  },
  BlueMojiCollectionSearchItems: {
    lexicon: 1,
    id: "blue.moji.collection.searchItems",
    defs: {
      main: {
        type: "query",
        description:
          "Search Bluemoji by alias or alt text. Intended as shared infrastructure so clients don't need to maintain their own emoji search index. Two distinct matching modes depending on 'repo': pass it for substring matching within one repo's own collection (suited to live-typing :-autocomplete in a composer — every keystroke narrows correctly, including partial prefixes); omit it for network-wide full-text search (subject to takedown filtering), which matches whole words/tokens rather than arbitrary substrings — e.g. 'cat' can match ':blobcat:' but 'blob' alone may not, since the underlying index is word-oriented. Network-wide mode suits a 'discover emoji' browse/search surface better than character-by-character autocomplete.",
        parameters: {
          type: "params",
          required: ["q"],
          properties: {
            q: {
              type: "string",
              description: "Search query, matched against the alias and alt text.",
              minLength: 1,
              maxLength: 100,
            },
            repo: {
              type: "string",
              format: "at-identifier",
              description:
                "Restrict results to a single repo's collection, using substring matching. Network-wide whole-word search when omitted.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
            cursor: {
              type: "string",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["items"],
            properties: {
              cursor: {
                type: "string",
              },
              items: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.collection.item#itemView",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiEmbedSticker: {
    lexicon: 1,
    id: "blue.moji.embed.sticker",
    defs: {
      main: {
        type: "object",
        description:
          "A full-sized Bluemoji sticker attached to a post as media, in the style of app.bsky.embed.external. References a blue.moji.collection.item record in the sticker owner's repo.",
        required: ["sticker"],
        properties: {
          sticker: {
            type: "ref",
            ref: "lex:blue.moji.embed.sticker#sticker",
          },
        },
      },
      sticker: {
        type: "object",
        description:
          "SECURITY: did/name/formats are self-attested by the posting client, like blue.moji.richtext.facet. Verify against the record strongRef (or by re-deriving the rkey from name and looking up did's blue.moji.collection.item) before rendering an image, if the render surface matters for trust.",
        required: ["did", "name", "formats"],
        properties: {
          record: {
            type: "ref",
            ref: "lex:com.atproto.repo.strongRef",
            description:
              "Strong reference to the source blue.moji.collection.item record. Use this as the verification anchor: resolve it and compare formats before trusting this embed's claims.",
          },
          did: {
            type: "string",
            format: "did",
            description:
              "DID of the repo that owns the sticker record. Combined with the format CIDs to construct blob/CDN URLs without a getRecord round-trip, mirroring blue.moji.richtext.facet. Self-attested; see security note on this object.",
          },
          name: {
            type: "string",
            description:
              "Colon-wrapped alias of the source Bluemoji (e.g. :blobcat:). Implementers should use this as fallback text when assets are unavailable.",
          },
          alt: {
            type: "string",
            description: "Alt text description of the sticker, for accessibility.",
          },
          aspectRatio: {
            type: "ref",
            ref: "lex:app.bsky.embed.defs#aspectRatio",
          },
          formats: {
            type: "union",
            description:
              "CIDs of the full-size sticker renditions. Open union to allow future formats.",
            refs: ["lex:blue.moji.embed.sticker#formats_v0"],
            closed: false,
          },
        },
      },
      formats_v0: {
        type: "object",
        description:
          "CIDs of the full-size (512px-class) blobs stored in the sticker owner's repo under blue.moji.collection.item stickerFormats. CID-only, like blue.moji.richtext.facet#formats_v1, because blobs cannot be referenced across repos.",
        properties: {
          png_512: {
            type: "string",
            format: "cid",
          },
          webp_512: {
            type: "string",
            format: "cid",
          },
          gif_512: {
            type: "string",
            format: "cid",
          },
          apng_512: {
            type: "string",
            format: "cid",
          },
          lottie: {
            type: "string",
            format: "cid",
          },
        },
      },
      view: {
        type: "object",
        required: ["sticker"],
        properties: {
          sticker: {
            type: "ref",
            ref: "lex:blue.moji.embed.sticker#viewSticker",
          },
        },
      },
      viewSticker: {
        type: "object",
        required: ["fullsize", "name"],
        properties: {
          fullsize: {
            type: "string",
            format: "uri",
            description: "Fully-qualified URL of the full-size sticker asset.",
          },
          thumb: {
            type: "string",
            format: "uri",
            description: "URL of the 128px inline-emoji rendition, if available.",
          },
          name: {
            type: "string",
          },
          alt: {
            type: "string",
          },
          aspectRatio: {
            type: "ref",
            ref: "lex:app.bsky.embed.defs#aspectRatio",
          },
          record: {
            type: "ref",
            ref: "lex:com.atproto.repo.strongRef",
          },
          labels: {
            type: "array",
            description:
              "AppViews producing this view MUST populate labels (and reflect the source item's adultOnly) from the verified blue.moji.collection.item record, not from the embed's own self-attested fields — see the security note on #sticker. Consumers SHOULD warn or blur before rendering fullsize/thumb when present.",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#label",
            },
          },
        },
      },
    },
  },
  BlueMojiFeedDefs: {
    lexicon: 1,
    id: "blue.moji.feed.defs",
    defs: {
      reactionView: {
        type: "object",
        description: "A single reaction by a single actor.",
        required: ["uri", "actor", "emoji", "createdAt"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          actor: {
            type: "ref",
            ref: "lex:app.bsky.actor.defs#profileViewBasic",
          },
          emoji: {
            type: "ref",
            ref: "lex:blue.moji.feed.reaction#emojiRef",
          },
          createdAt: {
            type: "string",
            format: "datetime",
          },
        },
      },
      reactionGroup: {
        type: "object",
        description: "Aggregated reactions to a subject, grouped by emoji item URI.",
        required: ["emoji", "count"],
        properties: {
          emoji: {
            type: "ref",
            ref: "lex:blue.moji.feed.reaction#emojiRef",
          },
          count: {
            type: "integer",
            minimum: 0,
          },
          viewer: {
            type: "string",
            format: "at-uri",
            description:
              "AT-URI of the requesting account's reaction record in this group, if any. Enables un-reacting.",
          },
        },
      },
    },
  },
  BlueMojiFeedGetReactionCounts: {
    lexicon: 1,
    id: "blue.moji.feed.getReactionCounts",
    defs: {
      main: {
        type: "query",
        description:
          "Batch version of blue.moji.feed.getReactions for timelines: aggregated reaction groups (counts only, no paginated individual reactions) for many posts in one call, avoiding an N+1 fetch per rendered post. Use getReactions for a single post's full detail (e.g. its own dedicated view with an actor list).",
        parameters: {
          type: "params",
          required: ["uris"],
          properties: {
            uris: {
              type: "array",
              items: {
                type: "string",
                format: "at-uri",
              },
              maxLength: 50,
              description:
                "AT-URIs of the subject posts. Send as a single comma-joined value (e.g. 'uris=at://a,at://b'), not repeated 'uris=' keys — this AppView's implementation currently only sees the last occurrence of a repeated query key. AT-URIs never contain commas (record keys exclude them), so this is unambiguous.",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["counts"],
            properties: {
              counts: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.feed.getReactionCounts#subjectReactionCounts",
                },
              },
            },
          },
        },
      },
      subjectReactionCounts: {
        type: "object",
        required: ["uri", "groups"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
            description:
              "AT-URI of the subject post. Subjects with zero reactions are omitted from the response rather than included with an empty groups array.",
          },
          groups: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:blue.moji.feed.defs#reactionGroup",
            },
          },
        },
      },
    },
  },
  BlueMojiFeedGetReactions: {
    lexicon: 1,
    id: "blue.moji.feed.getReactions",
    defs: {
      main: {
        type: "query",
        description:
          "Get reactions for a post: aggregated per-emoji groups plus a paginated list of individual reactions.",
        parameters: {
          type: "params",
          required: ["uri"],
          properties: {
            uri: {
              type: "string",
              format: "at-uri",
              description: "AT-URI of the subject post.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: "string",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["uri", "groups", "reactions"],
            properties: {
              uri: {
                type: "string",
                format: "at-uri",
              },
              cursor: {
                type: "string",
              },
              groups: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.feed.defs#reactionGroup",
                },
              },
              reactions: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.feed.defs#reactionView",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiFeedGetTrending: {
    lexicon: 1,
    id: "blue.moji.feed.getTrending",
    defs: {
      main: {
        type: "query",
        description:
          'AppView-computed "Weekly Top Bluemoji": the custom emoji reacted with by the most distinct actors in a recent window. Purely a discovery/trending signal derived from indexed blue.moji.feed.reaction records verified against their source blue.moji.collection.item — not a network-wide count (only reflects reactions this AppView has indexed), and not the same per-post cap applied by getReactions/getReactionCounts.',
        parameters: {
          type: "params",
          properties: {
            period: {
              type: "string",
              default: "week",
              description:
                "Trending window: 'day', 'week', or 'month'. Any other value is rejected.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 25,
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["period", "items"],
            properties: {
              period: {
                type: "string",
              },
              items: {
                type: "array",
                description:
                  "blue.moji.feed.defs#reactionGroup entries reused here: 'count' is the distinct-reactor count within the window (not a per-post count), and 'viewer' is always omitted since there's no single subject.",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.feed.defs#reactionGroup",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiFeedReaction: {
    lexicon: 1,
    id: "blue.moji.feed.reaction",
    defs: {
      main: {
        type: "record",
        description:
          "A custom-emoji reaction to a post. Analogous to app.bsky.feed.like, but the reaction glyph is a Bluemoji. Duplicate reactions (same subject + same emoji URI by the same actor) should be ignored by AppViews.",
        key: "tid",
        record: {
          type: "object",
          required: ["subject", "emoji", "createdAt"],
          properties: {
            subject: {
              type: "string",
              format: "at-uri",
              description: "AT-URI of the post being reacted to.",
            },
            subjectCid: {
              type: "string",
              format: "cid",
              description: "CID of the subject post at reaction time, for strong referencing.",
            },
            emoji: {
              type: "ref",
              ref: "lex:blue.moji.feed.reaction#emojiRef",
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
          },
        },
      },
      emojiRef: {
        type: "object",
        description:
          "Denormalized reference to the Bluemoji used, mirroring blue.moji.richtext.facet: CID-only formats let consumers build blob/CDN URLs without a getRecord round-trip. AppViews should verify against the indexed item where possible.",
        required: ["uri", "name", "formats"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
            description:
              "AT-URI of the blue.moji.collection.item record. The owning DID is derived from this.",
          },
          cid: {
            type: "string",
            format: "cid",
            description:
              "CID of the blue.moji.collection.item record, populated by AppViews at hydration time (like adultOnly) so consumers can build a com.atproto.repo.strongRef for moderation reports without a separate lookup. Not meaningful on write.",
          },
          name: {
            type: "string",
            description: "Colon-wrapped alias, e.g. :blobcat:. Used as fallback text.",
          },
          alt: {
            type: "string",
          },
          adultOnly: {
            type: "boolean",
            default: false,
            description:
              "MUST be populated by AppViews from the source item's adultOnly at hydration time (the source item is the trust anchor; do not trust a reactor-supplied value on write). Consumers SHOULD warn or blur before rendering when true, consistent with how the same item's adultOnly is handled elsewhere (facets, collection views).",
          },
          formats: {
            type: "union",
            refs: [
              "lex:blue.moji.richtext.facet#formats_v0",
              "lex:blue.moji.richtext.facet#formats_v1",
            ],
            closed: false,
          },
        },
      },
    },
  },
  BlueMojiPacksDefs: {
    lexicon: 1,
    id: "blue.moji.packs.defs",
    defs: {
      packViewBasic: {
        type: "object",
        required: ["uri", "cid", "name"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          cid: {
            type: "string",
            format: "cid",
          },
          name: {
            type: "string",
            maxLength: 64,
            minLength: 1,
          },
          description: {
            type: "string",
            maxGraphemes: 300,
            maxLength: 3000,
          },
          descriptionFacets: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:blue.moji.richtext.facet",
            },
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          itemCount: {
            type: "integer",
            minimum: 0,
          },
          labels: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#label",
            },
          },
          viewer: {
            type: "ref",
            ref: "lex:blue.moji.packs.defs#packViewerState",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
        },
      },
      packView: {
        type: "object",
        required: ["uri", "cid", "creator", "name", "indexedAt"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          cid: {
            type: "string",
            format: "cid",
          },
          creator: {
            type: "ref",
            ref: "lex:app.bsky.actor.defs#profileView",
          },
          name: {
            type: "string",
            maxLength: 64,
            minLength: 1,
          },
          description: {
            type: "string",
            maxGraphemes: 300,
            maxLength: 3000,
          },
          descriptionFacets: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:app.bsky.richtext.facet",
            },
          },
          avatar: {
            type: "string",
            format: "uri",
          },
          packItemCount: {
            type: "integer",
            minimum: 0,
          },
          labels: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#label",
            },
          },
          viewer: {
            type: "ref",
            ref: "lex:blue.moji.packs.defs#packViewerState",
          },
          indexedAt: {
            type: "string",
            format: "datetime",
          },
        },
      },
      packItemView: {
        type: "object",
        required: ["uri", "subject"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          subject: {
            type: "ref",
            ref: "lex:blue.moji.collection.item#itemView",
          },
        },
      },
      packViewerState: {
        type: "object",
        properties: {
          savedToCollection: {
            type: "boolean",
          },
        },
      },
    },
  },
  BlueMojiPacksGetActorPacks: {
    lexicon: 1,
    id: "blue.moji.packs.getActorPacks",
    defs: {
      main: {
        type: "query",
        description: "Get a list of Bluemoji packs created by the actor.",
        parameters: {
          type: "params",
          required: ["actor"],
          properties: {
            actor: {
              type: "string",
              format: "at-identifier",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: "string",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["packs"],
            properties: {
              cursor: {
                type: "string",
              },
              packs: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.packs.defs#packViewBasic",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiPacksGetPack: {
    lexicon: 1,
    id: "blue.moji.packs.getPack",
    defs: {
      main: {
        type: "query",
        description: "Gets a 'view' (with additional context) of a specified pack.",
        parameters: {
          type: "params",
          required: ["pack"],
          properties: {
            pack: {
              type: "string",
              format: "at-uri",
              description: "Reference (AT-URI) of the pack record to hydrate.",
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 50,
            },
            cursor: {
              type: "string",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["pack", "items"],
            properties: {
              cursor: {
                type: "string",
              },
              pack: {
                type: "ref",
                ref: "lex:blue.moji.packs.defs#packView",
              },
              items: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.packs.defs#packItemView",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiPacksGetPacks: {
    lexicon: 1,
    id: "blue.moji.packs.getPacks",
    defs: {
      main: {
        type: "query",
        description: "Get views for a list of Bluemoji packs.",
        parameters: {
          type: "params",
          required: ["uris"],
          properties: {
            uris: {
              type: "array",
              items: {
                type: "string",
                format: "at-uri",
              },
              maxLength: 25,
              description:
                "Send as a single comma-joined value (e.g. 'uris=at://a,at://b'), not repeated 'uris=' keys — this AppView's implementation currently only sees the last occurrence of a repeated query key. AT-URIs never contain commas (record keys exclude them), so this is unambiguous.",
            },
          },
        },
        output: {
          encoding: "application/json",
          schema: {
            type: "object",
            required: ["packs"],
            properties: {
              packs: {
                type: "array",
                items: {
                  type: "ref",
                  ref: "lex:blue.moji.packs.defs#packViewBasic",
                },
              },
            },
          },
        },
      },
    },
  },
  BlueMojiPacksPack: {
    lexicon: 1,
    id: "blue.moji.packs.pack",
    defs: {
      main: {
        type: "record",
        description: "A shareable Bluemoji pack",
        key: "tid",
        record: {
          type: "object",
          required: ["name", "createdAt"],
          properties: {
            name: {
              type: "string",
              maxLength: 64,
              minLength: 1,
            },
            description: {
              type: "string",
              maxGraphemes: 300,
              maxLength: 3000,
            },
            descriptionFacets: {
              type: "array",
              items: {
                type: "ref",
                ref: "lex:blue.moji.richtext.facet",
              },
            },
            icon: {
              type: "blob",
              accept: ["image/png", "image/jpeg"],
              maxSize: 1000000,
            },
            adultOnly: {
              type: "boolean",
              default: false,
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
            labels: {
              type: "union",
              description: "Self-label values for this emoji. Effectively content warnings.",
              refs: ["lex:com.atproto.label.defs#selfLabels"],
            },
          },
        },
      },
    },
  },
  BlueMojiPacksPackitem: {
    lexicon: 1,
    id: "blue.moji.packs.packitem",
    defs: {
      main: {
        type: "record",
        description:
          "Record representing a Bluemoji's inclusion in a specific pack. The AppView will ignore duplicate item records.",
        key: "tid",
        record: {
          type: "object",
          required: ["subject", "pack", "createdAt"],
          properties: {
            subject: {
              type: "string",
              format: "at-uri",
              description:
                "Reference (AT-URI) to the Bluemoji item record (blue.moji.collection.item).",
            },
            pack: {
              type: "string",
              format: "at-uri",
              description: "Reference (AT-URI) to the pack record (blue.moji.packs.pack).",
            },
            createdAt: {
              type: "string",
              format: "datetime",
            },
          },
        },
      },
    },
  },
  BlueMojiRichtextFacet: {
    lexicon: 1,
    id: "blue.moji.richtext.facet",
    defs: {
      main: {
        type: "object",
        description:
          "SECURITY: did/name/formats/adultOnly/labels are all self-attested by the posting client at write time and are not re-validated by the PDS. Consumers that render an image from this facet without first verifying it against the referenced blue.moji.collection.item record (e.g. via an AppView's blue.moji.collection.getItem, hydrated from firehose-verified data) are trusting the poster to have told the truth about whose emoji it is, what it looks like, and whether it needs a content warning. In particular, adultOnly/labels here MUST NOT be trusted for moderation decisions — a poster could simply omit them to bypass a warning the source item's own record carries. Verified renderers should use the source item's adultOnly/labels instead. Renderers that skip verification SHOULD treat the facet as decorative/best-effort only, exactly as they would an unverified embed.",
        required: ["did", "name", "formats"],
        properties: {
          did: {
            type: "string",
            description:
              "DID of the user posting the Bluemoji. Self-attested; see security note on this object.",
          },
          name: {
            type: "string",
            description: "Name of the Bluemoji in :emoji: format",
          },
          alt: {
            type: "string",
          },
          adultOnly: {
            type: "boolean",
            default: false,
            description:
              "Self-attested by the poster; see security note on this object. Verified renderers SHOULD use the source item's adultOnly instead.",
          },
          labels: {
            type: "union",
            description:
              "Self-label values for this emoji. Effectively content warnings. Self-attested by the poster; see security note on this object.",
            refs: ["lex:com.atproto.label.defs#selfLabels"],
          },
          formats: {
            type: "union",
            description:
              "#formats_v0 is deprecated (see RFC 0001); writers MUST produce #formats_v1.",
            refs: [
              "lex:blue.moji.richtext.facet#formats_v0",
              "lex:blue.moji.richtext.facet#formats_v1",
            ],
            closed: false,
          },
        },
      },
      formats_v1: {
        type: "object",
        description:
          "Only the CID is provided; combine with the facet's did to construct a blob/CDN URL with no additional round-trip. All formats, including animated ones, are CIDs of Blob-typed values on the source record.",
        properties: {
          png_128: {
            type: "string",
            format: "cid",
          },
          webp_128: {
            type: "string",
            format: "cid",
          },
          gif_128: {
            type: "string",
            format: "cid",
          },
          apng_128: {
            type: "string",
            format: "cid",
          },
          lottie: {
            type: "string",
            format: "cid",
          },
        },
      },
      formats_v0: {
        type: "object",
        description:
          "DEPRECATED, corresponds to blue.moji.collection.item#formats_v0. png/webp/gif are CIDs combinable with the facet's did to build a blob/CDN URL; apng_128/lottie are raw Bytes on the source record (not Blob) so are only marked present here as a boolean and require a com.atproto.repo.getRecord round-trip to render.",
        properties: {
          png_128: {
            type: "string",
            format: "cid",
          },
          webp_128: {
            type: "string",
            format: "cid",
          },
          gif_128: {
            type: "string",
            format: "cid",
          },
          apng_128: {
            type: "boolean",
            default: false,
          },
          lottie: {
            type: "boolean",
            default: false,
          },
        },
      },
    },
  },
  ComAtprotoLabelDefs: {
    lexicon: 1,
    id: "com.atproto.label.defs",
    defs: {
      label: {
        type: "object",
        description: "Metadata tag on an atproto resource (eg, repo or record).",
        required: ["src", "uri", "val", "cts"],
        properties: {
          ver: {
            type: "integer",
          },
          src: {
            type: "string",
            format: "did",
          },
          uri: {
            type: "string",
            format: "uri",
          },
          cid: {
            type: "string",
            format: "cid",
          },
          val: {
            type: "string",
            maxLength: 128,
          },
          neg: {
            type: "boolean",
          },
          cts: {
            type: "string",
            format: "datetime",
          },
          exp: {
            type: "string",
            format: "datetime",
          },
          sig: {
            type: "bytes",
          },
        },
      },
      selfLabels: {
        type: "object",
        description:
          "Metadata tags on an atproto record, published by the author within the record.",
        required: ["values"],
        properties: {
          values: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#selfLabel",
            },
            maxLength: 10,
          },
        },
      },
      selfLabel: {
        type: "object",
        required: ["val"],
        properties: {
          val: {
            type: "string",
            maxLength: 128,
          },
        },
      },
      labelValueDefinition: {
        type: "object",
        description: "Declares a label value and its expected interpretations and behaviors.",
        required: ["identifier", "severity", "blurs", "locales"],
        properties: {
          identifier: {
            type: "string",
            maxLength: 100,
          },
          severity: {
            type: "string",
            knownValues: ["inform", "alert", "none"],
          },
          blurs: {
            type: "string",
            knownValues: ["content", "media", "none"],
          },
          defaultSetting: {
            type: "string",
            knownValues: ["ignore", "warn", "hide"],
          },
          adultOnly: {
            type: "boolean",
          },
          locales: {
            type: "array",
            items: {
              type: "ref",
              ref: "lex:com.atproto.label.defs#labelValueDefinitionStrings",
            },
          },
        },
      },
      labelValueDefinitionStrings: {
        type: "object",
        required: ["lang", "name", "description"],
        properties: {
          lang: {
            type: "string",
            format: "language",
          },
          name: {
            type: "string",
            maxLength: 640,
          },
          description: {
            type: "string",
            maxLength: 100000,
          },
        },
      },
      labelValue: {
        type: "string",
        knownValues: [
          "!hide",
          "!no-promote",
          "!warn",
          "!no-unauthenticated",
          "dmca-violation",
          "doxxing",
          "porn",
          "sexual",
          "nudity",
          "nsfl",
          "gore",
        ],
      },
    },
  },
  ComAtprotoModerationDefs: {
    lexicon: 1,
    id: "com.atproto.moderation.defs",
    defs: {
      reasonType: {
        type: "string",
        knownValues: [
          "com.atproto.moderation.defs#reasonSpam",
          "com.atproto.moderation.defs#reasonViolation",
          "com.atproto.moderation.defs#reasonMisleading",
          "com.atproto.moderation.defs#reasonSexual",
          "com.atproto.moderation.defs#reasonRude",
          "com.atproto.moderation.defs#reasonOther",
          "com.atproto.moderation.defs#reasonAppeal",
        ],
      },
      reasonSpam: {
        type: "token",
        description: "Spam: frequent unwanted promotion, replies, mentions.",
      },
      reasonViolation: {
        type: "token",
        description: "Direct violation of server rules, laws, terms of service.",
      },
      reasonMisleading: {
        type: "token",
        description: "Misleading identity, affiliation, or content.",
      },
      reasonSexual: {
        type: "token",
        description: "Unwanted or mislabeled sexual content.",
      },
      reasonRude: {
        type: "token",
        description: "Rude, harassing, explicit, or otherwise unwelcoming behavior.",
      },
      reasonOther: {
        type: "token",
        description: "Reports not falling under another report category.",
      },
      reasonAppeal: {
        type: "token",
        description: "Appeal a previously taken moderation action.",
      },
      subjectType: {
        type: "string",
        description: "Tag describing a type of subject that might be reported.",
        knownValues: ["account", "record", "chat"],
      },
    },
  },
  ComAtprotoRepoStrongRef: {
    lexicon: 1,
    id: "com.atproto.repo.strongRef",
    description: "A URI with a content-hash fingerprint.",
    defs: {
      main: {
        type: "object",
        required: ["uri", "cid"],
        properties: {
          uri: {
            type: "string",
            format: "at-uri",
          },
          cid: {
            type: "string",
            format: "cid",
          },
        },
      },
    },
  },
} as const satisfies Record<string, LexiconDoc>;
export const schemas = Object.values(schemaDict) satisfies LexiconDoc[];
export const lexicons: Lexicons = new Lexicons(schemas);

export function validate<T extends { $type: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType: true,
): ValidationResult<T>;
export function validate<T extends { $type?: string }>(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: false,
): ValidationResult<T>;
export function validate(
  v: unknown,
  id: string,
  hash: string,
  requiredType?: boolean,
): ValidationResult {
  return (requiredType ? is$typed : maybe$typed)(v, id, hash)
    ? lexicons.validate(`${id}#${hash}`, v)
    : {
        success: false,
        error: new ValidationError(
          `Must be an object with "${hash === "main" ? id : `${id}#${hash}`}" $type property`,
        ),
      };
}

export const ids = {
  AppBskyActorDefs: "app.bsky.actor.defs",
  AppBskyEmbedDefs: "app.bsky.embed.defs",
  AppBskyEmbedExternal: "app.bsky.embed.external",
  AppBskyEmbedImages: "app.bsky.embed.images",
  AppBskyEmbedRecord: "app.bsky.embed.record",
  AppBskyEmbedRecordWithMedia: "app.bsky.embed.recordWithMedia",
  AppBskyEmbedVideo: "app.bsky.embed.video",
  AppBskyFeedDefs: "app.bsky.feed.defs",
  AppBskyFeedPostgate: "app.bsky.feed.postgate",
  AppBskyFeedThreadgate: "app.bsky.feed.threadgate",
  AppBskyGraphDefs: "app.bsky.graph.defs",
  AppBskyLabelerDefs: "app.bsky.labeler.defs",
  AppBskyNotificationDefs: "app.bsky.notification.defs",
  AppBskyRichtextFacet: "app.bsky.richtext.facet",
  BlueMojiCollectionDefs: "blue.moji.collection.defs",
  BlueMojiCollectionGetItem: "blue.moji.collection.getItem",
  BlueMojiCollectionItem: "blue.moji.collection.item",
  BlueMojiCollectionListCollection: "blue.moji.collection.listCollection",
  BlueMojiCollectionPutItem: "blue.moji.collection.putItem",
  BlueMojiCollectionSaveToCollection: "blue.moji.collection.saveToCollection",
  BlueMojiCollectionSearchItems: "blue.moji.collection.searchItems",
  BlueMojiEmbedSticker: "blue.moji.embed.sticker",
  BlueMojiFeedDefs: "blue.moji.feed.defs",
  BlueMojiFeedGetReactionCounts: "blue.moji.feed.getReactionCounts",
  BlueMojiFeedGetReactions: "blue.moji.feed.getReactions",
  BlueMojiFeedGetTrending: "blue.moji.feed.getTrending",
  BlueMojiFeedReaction: "blue.moji.feed.reaction",
  BlueMojiPacksDefs: "blue.moji.packs.defs",
  BlueMojiPacksGetActorPacks: "blue.moji.packs.getActorPacks",
  BlueMojiPacksGetPack: "blue.moji.packs.getPack",
  BlueMojiPacksGetPacks: "blue.moji.packs.getPacks",
  BlueMojiPacksPack: "blue.moji.packs.pack",
  BlueMojiPacksPackitem: "blue.moji.packs.packitem",
  BlueMojiRichtextFacet: "blue.moji.richtext.facet",
  ComAtprotoLabelDefs: "com.atproto.label.defs",
  ComAtprotoModerationDefs: "com.atproto.moderation.defs",
  ComAtprotoRepoStrongRef: "com.atproto.repo.strongRef",
} as const;
