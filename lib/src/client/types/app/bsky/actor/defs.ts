/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../lexicons";
import { type $Typed, is$typed as _is$typed, type OmitKey } from "../../../../util";
import type * as AppBskyEmbedExternal from "../embed/external.js";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";
import type * as AppBskyGraphDefs from "../graph/defs.js";
import type * as AppBskyNotificationDefs from "../notification/defs.js";
import type * as ComAtprotoRepoStrongRef from "../../../com/atproto/repo/strongRef.js";
import type * as AppBskyFeedThreadgate from "../feed/threadgate.js";
import type * as AppBskyFeedPostgate from "../feed/postgate.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "app.bsky.actor.defs";

/** A new user experiences (NUX) storage object */
export interface Nux {
  $type?: "app.bsky.actor.defs#nux";
  id: string;
  /** Arbitrary data for the NUX. The structure is defined by the NUX itself. Limited to 300 characters. */
  data?: string;
  completed: boolean;
  /** The date and time at which the NUX will expire and should be considered completed. */
  expiresAt?: string;
}

const hashNux = "nux";

export function isNux<V>(v: V) {
  return is$typed(v, id, hashNux);
}

export function validateNux<V>(v: V) {
  return validate<Nux & V>(v, id, hashNux);
}

/** A word that the account owner has muted. */
export interface MutedWord {
  $type?: "app.bsky.actor.defs#mutedWord";
  id?: string;
  /** The muted word itself. */
  value: string;
  /** The intended targets of the muted word. */
  targets: MutedWordTarget[];
  /** The date and time at which the muted word will expire and no longer be applied. */
  expiresAt?: string;
  /** Groups of users to apply the muted word to. If undefined, applies to all users. */
  actorTarget: "all" | "exclude-following" | (string & {});
}

const hashMutedWord = "mutedWord";

export function isMutedWord<V>(v: V) {
  return is$typed(v, id, hashMutedWord);
}

export function validateMutedWord<V>(v: V) {
  return validate<MutedWord & V>(v, id, hashMutedWord);
}

export interface SavedFeed {
  $type?: "app.bsky.actor.defs#savedFeed";
  id: string;
  type: "feed" | "list" | "timeline" | (string & {});
  value: string;
  pinned: boolean;
}

const hashSavedFeed = "savedFeed";

export function isSavedFeed<V>(v: V) {
  return is$typed(v, id, hashSavedFeed);
}

export function validateSavedFeed<V>(v: V) {
  return validate<SavedFeed & V>(v, id, hashSavedFeed);
}

export interface StatusView {
  $type?: "app.bsky.actor.defs#statusView";
  cid?: string;
  uri?: string;
  embed?: $Typed<AppBskyEmbedExternal.View> | { $type: string };
  labels?: ComAtprotoLabelDefs.Label[];
  record: { [_ in string]: unknown };
  /** The status for the account. */
  status: "app.bsky.actor.status#live" | (string & {});
  /** True if the status is not expired, false if it is expired. Only present if expiration was set. */
  isActive?: boolean;
  /** The date when this status will expire. The application might choose to no longer return the status after expiration. */
  expiresAt?: string;
  /** True if the user's go-live access has been disabled by a moderator, false otherwise. */
  isDisabled?: boolean;
}

const hashStatusView = "statusView";

export function isStatusView<V>(v: V) {
  return is$typed(v, id, hashStatusView);
}

export function validateStatusView<V>(v: V) {
  return validate<StatusView & V>(v, id, hashStatusView);
}

export type Preferences = (
  | $Typed<AdultContentPref>
  | $Typed<ContentLabelPref>
  | $Typed<SavedFeedsPref>
  | $Typed<SavedFeedsPrefV2>
  | $Typed<PersonalDetailsPref>
  | $Typed<DeclaredAgePref>
  | $Typed<FeedViewPref>
  | $Typed<ThreadViewPref>
  | $Typed<InterestsPref>
  | $Typed<MutedWordsPref>
  | $Typed<HiddenPostsPref>
  | $Typed<BskyAppStatePref>
  | $Typed<LabelersPref>
  | $Typed<PostInteractionSettingsPref>
  | $Typed<VerificationPrefs>
  | $Typed<LiveEventPreferences>
  | { $type: string }
)[];

export interface ProfileView {
  $type?: "app.bsky.actor.defs#profileView";
  did: string;
  /** Debug information for internal development */
  debug?: { [_ in string]: unknown };
  avatar?: string;
  handle: string;
  labels?: ComAtprotoLabelDefs.Label[];
  status?: StatusView;
  viewer?: ViewerState;
  pronouns?: string;
  createdAt?: string;
  indexedAt?: string;
  associated?: ProfileAssociated;
  description?: string;
  displayName?: string;
  verification?: VerificationState;
}

const hashProfileView = "profileView";

export function isProfileView<V>(v: V) {
  return is$typed(v, id, hashProfileView);
}

export function validateProfileView<V>(v: V) {
  return validate<ProfileView & V>(v, id, hashProfileView);
}

/** Metadata about the requesting account's relationship with the subject account. Only has meaningful content for authed requests. */
export interface ViewerState {
  $type?: "app.bsky.actor.defs#viewerState";
  muted?: boolean;
  blocking?: string;
  blockedBy?: boolean;
  following?: string;
  followedBy?: string;
  mutedByList?: AppBskyGraphDefs.ListViewBasic;
  blockingByList?: AppBskyGraphDefs.ListViewBasic;
  knownFollowers?: KnownFollowers;
  activitySubscription?: AppBskyNotificationDefs.ActivitySubscription;
}

const hashViewerState = "viewerState";

export function isViewerState<V>(v: V) {
  return is$typed(v, id, hashViewerState);
}

export function validateViewerState<V>(v: V) {
  return validate<ViewerState & V>(v, id, hashViewerState);
}

export interface FeedViewPref {
  $type?: "app.bsky.actor.defs#feedViewPref";
  /** The URI of the feed, or an identifier which describes the feed. */
  feed: string;
  /** Hide replies in the feed. */
  hideReplies?: boolean;
  /** Hide reposts in the feed. */
  hideReposts?: boolean;
  /** Hide quote posts in the feed. */
  hideQuotePosts?: boolean;
  /** Hide replies in the feed if they do not have this number of likes. */
  hideRepliesByLikeCount?: number;
  /** Hide replies in the feed if they are not by followed users. */
  hideRepliesByUnfollowed: boolean;
}

const hashFeedViewPref = "feedViewPref";

export function isFeedViewPref<V>(v: V) {
  return is$typed(v, id, hashFeedViewPref);
}

export function validateFeedViewPref<V>(v: V) {
  return validate<FeedViewPref & V>(v, id, hashFeedViewPref);
}

export interface LabelersPref {
  $type?: "app.bsky.actor.defs#labelersPref";
  labelers: LabelerPrefItem[];
}

const hashLabelersPref = "labelersPref";

export function isLabelersPref<V>(v: V) {
  return is$typed(v, id, hashLabelersPref);
}

export function validateLabelersPref<V>(v: V) {
  return validate<LabelersPref & V>(v, id, hashLabelersPref);
}

export interface InterestsPref {
  $type?: "app.bsky.actor.defs#interestsPref";
  /** A list of tags which describe the account owner's interests gathered during onboarding. */
  tags: string[];
}

const hashInterestsPref = "interestsPref";

export function isInterestsPref<V>(v: V) {
  return is$typed(v, id, hashInterestsPref);
}

export function validateInterestsPref<V>(v: V) {
  return validate<InterestsPref & V>(v, id, hashInterestsPref);
}

/** The subject's followers whom you also follow */
export interface KnownFollowers {
  $type?: "app.bsky.actor.defs#knownFollowers";
  count: number;
  followers: ProfileViewBasic[];
}

const hashKnownFollowers = "knownFollowers";

export function isKnownFollowers<V>(v: V) {
  return is$typed(v, id, hashKnownFollowers);
}

export function validateKnownFollowers<V>(v: V) {
  return validate<KnownFollowers & V>(v, id, hashKnownFollowers);
}

export interface MutedWordsPref {
  $type?: "app.bsky.actor.defs#mutedWordsPref";
  /** A list of words the account owner has muted. */
  items: MutedWord[];
}

const hashMutedWordsPref = "mutedWordsPref";

export function isMutedWordsPref<V>(v: V) {
  return is$typed(v, id, hashMutedWordsPref);
}

export function validateMutedWordsPref<V>(v: V) {
  return validate<MutedWordsPref & V>(v, id, hashMutedWordsPref);
}

export interface SavedFeedsPref {
  $type?: "app.bsky.actor.defs#savedFeedsPref";
  saved: string[];
  pinned: string[];
  timelineIndex?: number;
}

const hashSavedFeedsPref = "savedFeedsPref";

export function isSavedFeedsPref<V>(v: V) {
  return is$typed(v, id, hashSavedFeedsPref);
}

export function validateSavedFeedsPref<V>(v: V) {
  return validate<SavedFeedsPref & V>(v, id, hashSavedFeedsPref);
}

export interface ThreadViewPref {
  $type?: "app.bsky.actor.defs#threadViewPref";
  /** Sorting mode for threads. */
  sort?: "oldest" | "newest" | "most-likes" | "random" | "hotness" | (string & {});
}

const hashThreadViewPref = "threadViewPref";

export function isThreadViewPref<V>(v: V) {
  return is$typed(v, id, hashThreadViewPref);
}

export function validateThreadViewPref<V>(v: V) {
  return validate<ThreadViewPref & V>(v, id, hashThreadViewPref);
}

/** Read-only preference containing value(s) inferred from the user's declared birthdate. Absence of this preference object in the response indicates that the user has not made a declaration. */
export interface DeclaredAgePref {
  $type?: "app.bsky.actor.defs#declaredAgePref";
  /** Indicates if the user has declared that they are over 13 years of age. */
  isOverAge13?: boolean;
  /** Indicates if the user has declared that they are over 16 years of age. */
  isOverAge16?: boolean;
  /** Indicates if the user has declared that they are over 18 years of age. */
  isOverAge18?: boolean;
}

const hashDeclaredAgePref = "declaredAgePref";

export function isDeclaredAgePref<V>(v: V) {
  return is$typed(v, id, hashDeclaredAgePref);
}

export function validateDeclaredAgePref<V>(v: V) {
  return validate<DeclaredAgePref & V>(v, id, hashDeclaredAgePref);
}

export interface HiddenPostsPref {
  $type?: "app.bsky.actor.defs#hiddenPostsPref";
  /** A list of URIs of posts the account owner has hidden. */
  items: string[];
}

const hashHiddenPostsPref = "hiddenPostsPref";

export function isHiddenPostsPref<V>(v: V) {
  return is$typed(v, id, hashHiddenPostsPref);
}

export function validateHiddenPostsPref<V>(v: V) {
  return validate<HiddenPostsPref & V>(v, id, hashHiddenPostsPref);
}

export interface LabelerPrefItem {
  $type?: "app.bsky.actor.defs#labelerPrefItem";
  did: string;
}

const hashLabelerPrefItem = "labelerPrefItem";

export function isLabelerPrefItem<V>(v: V) {
  return is$typed(v, id, hashLabelerPrefItem);
}

export function validateLabelerPrefItem<V>(v: V) {
  return validate<LabelerPrefItem & V>(v, id, hashLabelerPrefItem);
}

export type MutedWordTarget = "content" | "tag" | (string & {});

export interface AdultContentPref {
  $type?: "app.bsky.actor.defs#adultContentPref";
  enabled: boolean;
}

const hashAdultContentPref = "adultContentPref";

export function isAdultContentPref<V>(v: V) {
  return is$typed(v, id, hashAdultContentPref);
}

export function validateAdultContentPref<V>(v: V) {
  return validate<AdultContentPref & V>(v, id, hashAdultContentPref);
}

/** A grab bag of state that's specific to the bsky.app program. Third-party apps shouldn't use this. */
export interface BskyAppStatePref {
  $type?: "app.bsky.actor.defs#bskyAppStatePref";
  /** Storage for NUXs the user has encountered. */
  nuxs?: Nux[];
  /** An array of tokens which identify nudges (modals, popups, tours, highlight dots) that should be shown to the user. */
  queuedNudges?: string[];
  activeProgressGuide?: BskyAppProgressGuide;
}

const hashBskyAppStatePref = "bskyAppStatePref";

export function isBskyAppStatePref<V>(v: V) {
  return is$typed(v, id, hashBskyAppStatePref);
}

export function validateBskyAppStatePref<V>(v: V) {
  return validate<BskyAppStatePref & V>(v, id, hashBskyAppStatePref);
}

export interface ContentLabelPref {
  $type?: "app.bsky.actor.defs#contentLabelPref";
  label: string;
  /** Which labeler does this preference apply to? If undefined, applies globally. */
  labelerDid?: string;
  visibility: "ignore" | "show" | "warn" | "hide" | (string & {});
}

const hashContentLabelPref = "contentLabelPref";

export function isContentLabelPref<V>(v: V) {
  return is$typed(v, id, hashContentLabelPref);
}

export function validateContentLabelPref<V>(v: V) {
  return validate<ContentLabelPref & V>(v, id, hashContentLabelPref);
}

export interface ProfileViewBasic {
  $type?: "app.bsky.actor.defs#profileViewBasic";
  did: string;
  /** Debug information for internal development */
  debug?: { [_ in string]: unknown };
  avatar?: string;
  handle: string;
  labels?: ComAtprotoLabelDefs.Label[];
  status?: StatusView;
  viewer?: ViewerState;
  pronouns?: string;
  createdAt?: string;
  associated?: ProfileAssociated;
  displayName?: string;
  verification?: VerificationState;
}

const hashProfileViewBasic = "profileViewBasic";

export function isProfileViewBasic<V>(v: V) {
  return is$typed(v, id, hashProfileViewBasic);
}

export function validateProfileViewBasic<V>(v: V) {
  return validate<ProfileViewBasic & V>(v, id, hashProfileViewBasic);
}

export interface SavedFeedsPrefV2 {
  $type?: "app.bsky.actor.defs#savedFeedsPrefV2";
  items: SavedFeed[];
}

const hashSavedFeedsPrefV2 = "savedFeedsPrefV2";

export function isSavedFeedsPrefV2<V>(v: V) {
  return is$typed(v, id, hashSavedFeedsPrefV2);
}

export function validateSavedFeedsPrefV2<V>(v: V) {
  return validate<SavedFeedsPrefV2 & V>(v, id, hashSavedFeedsPrefV2);
}

/** An individual verification for an associated subject. */
export interface VerificationView {
  $type?: "app.bsky.actor.defs#verificationView";
  /** The AT-URI of the verification record. */
  uri: string;
  /** The user who issued this verification. */
  issuer: string;
  /** True if the verification passes validation, otherwise false. */
  isValid: boolean;
  /** Timestamp when the verification was created. */
  createdAt: string;
}

const hashVerificationView = "verificationView";

export function isVerificationView<V>(v: V) {
  return is$typed(v, id, hashVerificationView);
}

export function validateVerificationView<V>(v: V) {
  return validate<VerificationView & V>(v, id, hashVerificationView);
}

export interface ProfileAssociated {
  $type?: "app.bsky.actor.defs#profileAssociated";
  chat?: ProfileAssociatedChat;
  germ?: ProfileAssociatedGerm;
  lists?: number;
  labeler?: boolean;
  feedgens?: number;
  starterPacks?: number;
  activitySubscription?: ProfileAssociatedActivitySubscription;
}

const hashProfileAssociated = "profileAssociated";

export function isProfileAssociated<V>(v: V) {
  return is$typed(v, id, hashProfileAssociated);
}

export function validateProfileAssociated<V>(v: V) {
  return validate<ProfileAssociated & V>(v, id, hashProfileAssociated);
}

/** Preferences for how verified accounts appear in the app. */
export interface VerificationPrefs {
  $type?: "app.bsky.actor.defs#verificationPrefs";
  /** Hide the blue check badges for verified accounts and trusted verifiers. */
  hideBadges: boolean;
}

const hashVerificationPrefs = "verificationPrefs";

export function isVerificationPrefs<V>(v: V) {
  return is$typed(v, id, hashVerificationPrefs);
}

export function validateVerificationPrefs<V>(v: V) {
  return validate<VerificationPrefs & V>(v, id, hashVerificationPrefs);
}

/** Represents the verification information about the user this object is attached to. */
export interface VerificationState {
  $type?: "app.bsky.actor.defs#verificationState";
  /** All verifications issued by trusted verifiers on behalf of this user. Verifications by untrusted verifiers are not included. */
  verifications: VerificationView[];
  /** The user's status as a verified account. */
  verifiedStatus: "valid" | "invalid" | "none" | (string & {});
  /** The user's status as a trusted verifier. */
  trustedVerifierStatus: "valid" | "invalid" | "none" | (string & {});
}

const hashVerificationState = "verificationState";

export function isVerificationState<V>(v: V) {
  return is$typed(v, id, hashVerificationState);
}

export function validateVerificationState<V>(v: V) {
  return validate<VerificationState & V>(v, id, hashVerificationState);
}

export interface PersonalDetailsPref {
  $type?: "app.bsky.actor.defs#personalDetailsPref";
  /** The birth date of account owner. */
  birthDate?: string;
}

const hashPersonalDetailsPref = "personalDetailsPref";

export function isPersonalDetailsPref<V>(v: V) {
  return is$typed(v, id, hashPersonalDetailsPref);
}

export function validatePersonalDetailsPref<V>(v: V) {
  return validate<PersonalDetailsPref & V>(v, id, hashPersonalDetailsPref);
}

export interface ProfileViewDetailed {
  $type?: "app.bsky.actor.defs#profileViewDetailed";
  did: string;
  /** Debug information for internal development */
  debug?: { [_ in string]: unknown };
  avatar?: string;
  banner?: string;
  handle: string;
  labels?: ComAtprotoLabelDefs.Label[];
  status?: StatusView;
  viewer?: ViewerState;
  website?: string;
  pronouns?: string;
  createdAt?: string;
  indexedAt?: string;
  associated?: ProfileAssociated;
  pinnedPost?: ComAtprotoRepoStrongRef.Main;
  postsCount?: number;
  description?: string;
  displayName?: string;
  followsCount?: number;
  verification?: VerificationState;
  followersCount?: number;
  joinedViaStarterPack?: AppBskyGraphDefs.StarterPackViewBasic;
}

const hashProfileViewDetailed = "profileViewDetailed";

export function isProfileViewDetailed<V>(v: V) {
  return is$typed(v, id, hashProfileViewDetailed);
}

export function validateProfileViewDetailed<V>(v: V) {
  return validate<ProfileViewDetailed & V>(v, id, hashProfileViewDetailed);
}

/** If set, an active progress guide. Once completed, can be set to undefined. Should have unspecced fields tracking progress. */
export interface BskyAppProgressGuide {
  $type?: "app.bsky.actor.defs#bskyAppProgressGuide";
  guide: string;
}

const hashBskyAppProgressGuide = "bskyAppProgressGuide";

export function isBskyAppProgressGuide<V>(v: V) {
  return is$typed(v, id, hashBskyAppProgressGuide);
}

export function validateBskyAppProgressGuide<V>(v: V) {
  return validate<BskyAppProgressGuide & V>(v, id, hashBskyAppProgressGuide);
}

/** Preferences for live events. */
export interface LiveEventPreferences {
  $type?: "app.bsky.actor.defs#liveEventPreferences";
  /** Whether to hide all feeds from live events. */
  hideAllFeeds: boolean;
  /** A list of feed IDs that the user has hidden from live events. */
  hiddenFeedIds?: string[];
}

const hashLiveEventPreferences = "liveEventPreferences";

export function isLiveEventPreferences<V>(v: V) {
  return is$typed(v, id, hashLiveEventPreferences);
}

export function validateLiveEventPreferences<V>(v: V) {
  return validate<LiveEventPreferences & V>(v, id, hashLiveEventPreferences);
}

export interface ProfileAssociatedChat {
  $type?: "app.bsky.actor.defs#profileAssociatedChat";
  allowIncoming: "all" | "none" | "following" | (string & {});
}

const hashProfileAssociatedChat = "profileAssociatedChat";

export function isProfileAssociatedChat<V>(v: V) {
  return is$typed(v, id, hashProfileAssociatedChat);
}

export function validateProfileAssociatedChat<V>(v: V) {
  return validate<ProfileAssociatedChat & V>(v, id, hashProfileAssociatedChat);
}

export interface ProfileAssociatedGerm {
  $type?: "app.bsky.actor.defs#profileAssociatedGerm";
  messageMeUrl: string;
  showButtonTo: "usersIFollow" | "everyone" | (string & {});
}

const hashProfileAssociatedGerm = "profileAssociatedGerm";

export function isProfileAssociatedGerm<V>(v: V) {
  return is$typed(v, id, hashProfileAssociatedGerm);
}

export function validateProfileAssociatedGerm<V>(v: V) {
  return validate<ProfileAssociatedGerm & V>(v, id, hashProfileAssociatedGerm);
}

/** Default post interaction settings for the account. These values should be applied as default values when creating new posts. These refs should mirror the threadgate and postgate records exactly. */
export interface PostInteractionSettingsPref {
  $type?: "app.bsky.actor.defs#postInteractionSettingsPref";
  /** Matches threadgate record. List of rules defining who can reply to this users posts. If value is an empty array, no one can reply. If value is undefined, anyone can reply. */
  threadgateAllowRules?: (
    | $Typed<AppBskyFeedThreadgate.MentionRule>
    | $Typed<AppBskyFeedThreadgate.FollowerRule>
    | $Typed<AppBskyFeedThreadgate.FollowingRule>
    | $Typed<AppBskyFeedThreadgate.ListRule>
    | { $type: string }
  )[];
  /** Matches postgate record. List of rules defining who can embed this users posts. If value is an empty array or is undefined, no particular rules apply and anyone can embed. */
  postgateEmbeddingRules?: ($Typed<AppBskyFeedPostgate.DisableRule> | { $type: string })[];
}

const hashPostInteractionSettingsPref = "postInteractionSettingsPref";

export function isPostInteractionSettingsPref<V>(v: V) {
  return is$typed(v, id, hashPostInteractionSettingsPref);
}

export function validatePostInteractionSettingsPref<V>(v: V) {
  return validate<PostInteractionSettingsPref & V>(v, id, hashPostInteractionSettingsPref);
}

export interface ProfileAssociatedActivitySubscription {
  $type?: "app.bsky.actor.defs#profileAssociatedActivitySubscription";
  allowSubscriptions: "followers" | "mutuals" | "none" | (string & {});
}

const hashProfileAssociatedActivitySubscription = "profileAssociatedActivitySubscription";

export function isProfileAssociatedActivitySubscription<V>(v: V) {
  return is$typed(v, id, hashProfileAssociatedActivitySubscription);
}

export function validateProfileAssociatedActivitySubscription<V>(v: V) {
  return validate<ProfileAssociatedActivitySubscription & V>(
    v,
    id,
    hashProfileAssociatedActivitySubscription,
  );
}
