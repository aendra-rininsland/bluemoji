export type DatabaseSchema = {
  sub_state: SubState;
  detections: Detections;
};

export type SubState = {
  service: string;
  cursor: number;
};

export type Detections = {
  uri: string;
  timestamp: string;
  topLabel: string;
  topScore: number;
  raw: string;
  blobCid: string;
};
