// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react-native";

const rules = {
  items: {
    allow: {
      view: "auth.id != null",
      create: "auth.id != null",
      delete: "auth.id != null",
      update: "auth.id != null",
    },
  },
  store: {
    bind: ["isOwner", "auth.id != null && auth.id == data.peopleaId"],
    allow: {
      view: "isOwner || true",
      create: "auth.id != null",
      delete: "isOwner",
      update: "isOwner",
    },
  },
  orders: {
    allow: {
      view: "auth.id != null",
      create: "auth.id != null",
      delete: "auth.id != null",
      update: "auth.id != null",
    },
  },
  peoplea: {
    bind: ["isOwner", "auth.id != null && auth.id == data.userId"],
    allow: {
      view: "isOwner",
      create: "isOwner",
      delete: "isOwner",
      update: "isOwner",
    },
  },
  products: {
    allow: {
      view: "auth.id != null",
      create: "auth.id != null",
      delete: "auth.id != null",
      update: "auth.id != null",
    },
  },
  customers: {
    allow: {
      view: "auth.id != null",
      create: "auth.id != null",
      delete: "auth.id != null",
      update: "auth.id != null",
    },
  },
  __esModule: "true",
  collections: {
    allow: {
      view: "auth.id != null",
      create: "auth.id != null",
      delete: "auth.id != null",
      update: "auth.id != null",
    },
  },
} satisfies InstantRules;

export default rules;
