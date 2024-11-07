/*
  Warnings:

  - You are about to drop the column `Date` on the `Walk` table. All the data in the column will be lost.
  - Added the required column `date` to the `Walk` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Walk" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "ownerID" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    CONSTRAINT "Walk_ownerID_fkey" FOREIGN KEY ("ownerID") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Walk" ("count", "createdAt", "id", "ownerID", "updatedAt") SELECT "count", "createdAt", "id", "ownerID", "updatedAt" FROM "Walk";
DROP TABLE "Walk";
ALTER TABLE "new_Walk" RENAME TO "Walk";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
