import React, { useEffect, useState } from "react";
import { MsgBox } from "../ncurses/MsgBox";
import { Bluemoji } from "@aendra/bluemoji/components/react/index.tsx";
import * as BlueMojiCollectionItem from "../../../lexicon/types/blue/moji/collection/item";

export const Collection = ({ did }: { did: string }) => {
  const [items, setItems] = useState<BlueMojiCollectionItem.Record[]>([]);

  useEffect(() => {}, [did]);

  return (
    <MsgBox title="Collection!">
      <div style={{ textAlign: "center" }}>
        <p>Your Bluemoji collection:</p>
        {items.map((item) => (
          <Bluemoji key={item.name} item={item} did={did} />
        ))}
      </div>
    </MsgBox>
  );
};
