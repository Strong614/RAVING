const { exec } = require("child_process");

module.exports = {
  name: "forum",
  description: "Post a message to the SAES forum",
  execute(message, args) {
    if (!args.length) {
      return message.channel.send("❌ Please provide a message to post.");
    }

    const postContent = message.content.split(" ").slice(1).join(" ").replace(/"/g, '\\"'); // everything after !forum
    const encoded = Buffer.from(postContent, 'utf8').toString('base64'); // Encode to safely pass multiline

    message.channel.send("📨 Posting your message to the forum...");

    exec(`python forum_poster.py "${encoded}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ exec error: ${error.message}`);
        return message.channel.send("❌ Failed to post to the forum.");
      }

      if (stderr) console.error(`stderr: ${stderr}`);
      console.log(`stdout: ${stdout}`);
      message.channel.send("✅ Successfully posted to the forum.");
    });
  },
};
