-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "placeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "visitDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entries_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "wishlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "place" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "entryImages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entryId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entryImages_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tripEntries" (
    "tripId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,

    PRIMARY KEY ("tripId", "entryId"),
    CONSTRAINT "tripEntries_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tripEntries_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "entries" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "entries_placeId_idx" ON "entries"("placeId");

-- CreateIndex
CREATE INDEX "entryImages_entryId_idx" ON "entryImages"("entryId");

-- CreateIndex
CREATE INDEX "tripEntries_entryId_idx" ON "tripEntries"("entryId");
