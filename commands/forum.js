const { exec } = require("child_process");

module.exports = {
  name: "forum",
  description: "Post a message to the SAES forum",
  execute(message, args) {
    // Check if there's a message provided by the user
    if (!args.length) {
      return message.channel.send("❌ Please provide a message to post.");
    }

    // Join the arguments into a single string and escape quotes to prevent issues in the command
    const postContent = args.join(" ").replace(/"/g, '\\"'); // escape quotes

    // Send a message to Discord saying the bot is posting
    message.channel.send("📨 Posting your message to the forum...");

    // Run the Python script to post the message to the forum
    exec(`python forum_poster.py "${postContent}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`❌ exec error: ${error.message}`);
        return message.channel.send("❌ Failed to post to the forum.");
      }

      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }

      // Log the standard output from the Python script and inform the user of success
      console.log(`stdout: ${stdout}`);
      message.channel.send("✅ Successfully posted to the forum.");
    });
  },
};
