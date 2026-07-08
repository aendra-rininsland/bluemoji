/**
 * Minimal proto3 encoder for Signal's real StickerPack manifest message —
 * see signalapp/Signal-Desktop's sticker-creator/protos/Stickers.proto:
 *
 *   message StickerPack {
 *     message Sticker {
 *       optional uint32 id    = 1;
 *       optional string emoji = 2;
 *     }
 *     optional string  title    = 1;
 *     optional string  author   = 2;
 *     optional Sticker cover    = 3;
 *     repeated Sticker stickers = 4;
 *   }
 *
 * Hand-rolled instead of pulling in a protobuf dependency: the message is
 * four fields, all strings/varints/nested messages — proto3's wire format
 * for that is a few dozen lines. Verified against the real schema by
 * round-tripping encoded output through `protoc --decode=StickerPack`.
 */

export interface SignalSticker {
  id: number;
  emoji: string;
}

export interface SignalStickerPack {
  title: string;
  author: string;
  cover: SignalSticker;
  stickers: SignalSticker[];
}

function varint(n: number): Buffer {
  const bytes: number[] = [];
  let v = n;
  while (v > 0x7f) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return Buffer.from(bytes);
}

function tag(fieldNum: number, wireType: number): Buffer {
  return varint((fieldNum << 3) | wireType);
}

function lenDelim(fieldNum: number, buf: Buffer): Buffer {
  return Buffer.concat([tag(fieldNum, 2), varint(buf.length), buf]);
}

function encodeString(fieldNum: number, str: string): Buffer {
  return lenDelim(fieldNum, Buffer.from(str, "utf-8"));
}

function encodeVarintField(fieldNum: number, n: number): Buffer {
  return Buffer.concat([tag(fieldNum, 0), varint(n)]);
}

function encodeSticker({ id, emoji }: SignalSticker): Buffer {
  return Buffer.concat([encodeVarintField(1, id), encodeString(2, emoji)]);
}

export function encodeStickerPackManifest({
  title,
  author,
  cover,
  stickers,
}: SignalStickerPack): Buffer {
  const parts = [
    encodeString(1, title),
    encodeString(2, author),
    lenDelim(3, encodeSticker(cover)),
    ...stickers.map((s) => lenDelim(4, encodeSticker(s))),
  ];
  return Buffer.concat(parts);
}
