-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "visitDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entries_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_entries" ("category", "createdAt", "description", "id", "placeId", "rating", "title", "visitDate") SELECT "category", "createdAt", "description", "id", "placeId", "rating", "title", "visitDate" FROM "entries";
DROP TABLE "entries";
ALTER TABLE "new_entries" RENAME TO "entries";
CREATE INDEX "entries_placeId_idx" ON "entries"("placeId");
CREATE INDEX "entries_userId_idx" ON "entries"("userId");
CREATE TABLE "new_places" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "places_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_places" ("city", "country", "createdAt", "id") SELECT "city", "country", "createdAt", "id" FROM "places";
DROP TABLE "places";
ALTER TABLE "new_places" RENAME TO "places";
CREATE INDEX "places_userId_idx" ON "places"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
