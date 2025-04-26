const { exec } = require("child_process");

module.exports = {
  name: "forum",
  description: "Post a message to the SAES forum",
  execute(message, args) {
    if (!args.length) {
      return message.channel.send("❌ Please provide a message to post.");
    }

    // Join the message content and escape special characters
    const postContent = args.join(" ").replace(/"/g, '\\"'); // escape quotes
    const escapedPostContent = postContent.replace(/[\n\r]/g, " ");  // Remove any newline characters to avoid issues

    message.channel.send("📨 Posting your message to the forum...");

    exec(`python3 forum_poster.py "${escapedPostContent}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ exec error: ${error.message}`);
        return message.channel.send("❌ Failed to post to the forum.");
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      console.log(`stdout: ${stdout}`);
      message.channel.send("✅ Successfully posted to the forum.");
    });
  },
};
