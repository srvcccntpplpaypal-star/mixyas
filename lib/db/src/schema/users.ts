import { pgTable, text, serial, timestamp, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  countryCode: text("country_code").notNull(),
  country: text("country").notNull(),
  passwordHash: text("password_hash").notNull(),
  referredByCode: text("referred_by_code"), // code affilié ayant amené cet utilisateur
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const walletsTable = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  balance: numeric("balance", { precision: 12, scale: 2 }).notNull().default("5000.00"),
  currency: text("currency").notNull().default("FCFA"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const visitsTable = pgTable("visits", {
  id: serial("id").primaryKey(),
  ip: text("ip"),
  page: text("page").notNull(),
  userAgent: text("user_agent").notNull(),
  referrer: text("referrer"),
  userId: integer("user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// KYC — toutes les infos saisies directement sur le site, stockées en texte
export const kycTable = pgTable("kyc_submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  // Étape 1 — Identité
  fullName: text("full_name").notNull(),
  birthDate: text("birth_date").notNull(),
  birthPlace: text("birth_place").notNull(),
  nationality: text("nationality").notNull(),
  // Étape 2 — Document d'identité
  documentType: text("document_type").notNull(), // CNI | Passeport | Permis
  documentNumber: text("document_number").notNull(),
  documentFrontDesc: text("document_front_desc").notNull(),
  documentBackDesc: text("document_back_desc").notNull(),
  documentFrontUrl: text("document_front_url").notNull(),
  documentBackUrl: text("document_back_url").notNull(),
  selfieUrl: text("selfie_url").notNull(),
  // Étape 3 — Selfie
  selfieDesc: text("selfie_desc").notNull(),
  // Étape 4 — Justificatif domicile
  address: text("address").notNull(),
  addressProofDesc: text("address_proof_desc").notNull(),
  // Statut
  status: text("status").notNull().default("en_attente"), // en_attente | approuve | rejete
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Tâches rémunérées
export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  instructions: text("instructions").notNull(),
  reward: numeric("reward", { precision: 12, scale: 2 }).notNull().default("1000.00"),
  isActive: boolean("is_active").notNull().default(true),
  taskOrder: integer("task_order").notNull().default(99),
  difficulty: text("difficulty").notNull().default("normal"), // normal | timed_impossible | impossible
  timeLimit: integer("time_limit"), // secondes, null = pas de limite
  challengeCode: text("challenge_code"), // texte à saisir pour les défis impossibles
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Réalisations de tâches par les utilisateurs
export const taskCompletionsTable = pgTable("task_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  taskId: integer("task_id").notNull().references(() => tasksTable.id),
  proofText: text("proof_text").notNull(),
  status: text("status").notNull().default("en_attente"), // en_attente | approuve | rejete
  rewardPaid: boolean("reward_paid").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Dépôts initiés par les utilisateurs
export const depositsTable = pgTable("deposits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull().default("5000.00"),
  referenceCode: text("reference_code").notNull(),
  status: text("status").notNull().default("en_attente"), // en_attente | confirme | rejete
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Paramètres admin (clé-valeur)
export const adminSettingsTable = pgTable("admin_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

// Affiliés — personnes qui diffusent le lien YAS Service
export const affiliatesTable = pgTable("affiliates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  code: text("code").notNull().unique(), // code court unique (ex: ABC123)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Clics sur les liens affiliés
export const affiliateClicksTable = pgTable("affiliate_clicks", {
  id: serial("id").primaryKey(),
  affiliateCode: text("affiliate_code").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertWalletSchema = createInsertSchema(walletsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof walletsTable.$inferSelect;

export const insertVisitSchema = createInsertSchema(visitsTable).omit({ id: true, createdAt: true });
export type InsertVisit = z.infer<typeof insertVisitSchema>;
export type Visit = typeof visitsTable.$inferSelect;

export type Kyc = typeof kycTable.$inferSelect;
export type Task = typeof tasksTable.$inferSelect;
export type TaskCompletion = typeof taskCompletionsTable.$inferSelect;
export type Deposit = typeof depositsTable.$inferSelect;
