export type Bureau = "EQUIFAX" | "EXPERIAN" | "TRANSUNION";

export interface BureauAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

export const BUREAU_ADDRESSES: Record<Bureau, BureauAddress> = {
  EQUIFAX: {
    name: "Equifax Information Services LLC",
    street: "PO Box 105496",
    city: "Atlanta",
    state: "GA",
    zip: "30348-5496",
  },
  EXPERIAN: {
    name: "Experian",
    street: "PO Box 4500",
    city: "Allen",
    state: "TX",
    zip: "75013",
  },
  TRANSUNION: {
    name: "TransUnion LLC",
    street: "PO Box 2000",
    city: "Chester",
    state: "PA",
    zip: "19022",
  },
};