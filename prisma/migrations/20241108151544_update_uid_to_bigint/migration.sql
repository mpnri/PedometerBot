/*
  Warnings:

  - You are about to alter the column `uid` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uid" BIGINT NOT NULL
);
INSERT INTO "new_User" ("id", "uid") SELECT "id", "uid" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
