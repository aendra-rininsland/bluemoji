export type DatabaseSchema = {
  sub_state: SubState;
  bluemoji: Bluemoji;
};

export type SubState = {
  service: string;
  cursor: number;
};

export type Bluemoji = {
  name: string;
  uri: string;
  indexedAt: string;
};
