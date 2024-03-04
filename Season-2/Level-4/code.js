// Welcome to Secure Code Game Season-2/Level-4!

// Follow the instructions below to get started:

// 1. test.js is passing but the code here is vulnerable
// 2. Review the code. Can you spot the bugs(s)?
// 3. Fix the code.js but ensure that test.js passes
// 4. Run hack.js and if passing then CONGRATS!
// 5. If stuck then read the hint
// 6. Compare your solution with solution.js

const express = require("express");
const bodyParser = require("body-parser");
const libxmljs = require("libxmljs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { exec } = require("node:child_process");
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.text({ type: "application/xml" }));

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/ufo/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }

  console.log("Received uploaded file:", req.file.originalname);

  const uploadedFilePath = path.join(__dirname, req.file.originalname);
  fs.writeFileSync(uploadedFilePath, req.file.buffer);

  res.status(200).send("File uploaded successfully.");
});

app.post("/ufo", (req, res) => {
  const contentType = req.headers["content-type"];

  if (contentType === "application/json") {
    console.log("Received JSON data:", req.body);
    res.status(200).json({ ufo: "Received JSON data from an unknown planet." });
  } else if (contentType === "application/xml") {
    try {
      // Fix 1, 2, 3
      // まずnonetオプションをtrueにすることで、
      // 解析時にドキュメントタイプ定義(<!DOCTYPE...>)を無効にする
      // そうすると、カスタムエンティティも無効になる
      //
      // また、この際recoverもfalseに設定する
      // hackの方で求められているのは400のErrorなので、
      // ここでエラーが起きるようにしたい
      //
      // なおエラーの原理としては、XML本文で`&xxe`を指定しているのに対し、
      // nonet=trueのおかげでカスタムエンティティ`xxe`がなく解析エラーが起きるため
      //
      // Fix 4
      // replaceEntitiesもfalseにする必要があった
      // nonet=trueでもreplaceEntitiesにより、
      // XXEのカスタムエンティティの参照先ファイルの中身を読み込んで取り替えてしまう
      // 今回のケースでは、読み込んだ内容がshellコマンドで、
      // 後のコマンド実行機能で任意のコマンド結果を漏洩する形となった
      const xmlDoc = libxmljs.parseXml(req.body, {
        // replaceEntities: true,
        // recover: true,
        // nonet: false,
        replaceEntities: false,
        recover: false,
        nonet: true,
      });

      console.log("Received XML data from XMLon:", xmlDoc.toString());

      const extractedContent = [];

      xmlDoc
        .root()
        .childNodes()
        .forEach((node) => {
          if (node.type() === "element") {
            extractedContent.push(node.text());
          }
        });

      // Secret feature to allow an "admin" to execute commands
      if (
        xmlDoc.toString().includes('SYSTEM "') &&
        xmlDoc.toString().includes(".admin")
      ) {
        extractedContent.forEach((command) => {
          exec(command, (err, output) => {
            if (err) {
              console.error("could not execute command: ", err);
              return;
            }
            console.log("Output: \n", output);
            res.status(200).set("Content-Type", "text/plain").send(output);
          });
        });
      } else {
        res
          .status(200)
          .set("Content-Type", "text/plain")
          .send(extractedContent.join(" "));
      }
    } catch (error) {
      console.error("XML parsing or validation error:", error.message);
      res.status(400).send("Invalid XML: " + error.message);
    }
  } else {
    res.status(405).send("Unsupported content type");
  }
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = server;
