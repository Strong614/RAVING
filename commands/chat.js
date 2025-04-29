const { OpenAI } = require('openai');
const openai = new OpenAI({
    apiKey: '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',
    baseURL: 'https://openrouter.ai/api/v1', // <== This is IMPORTANT
});

async function handleChat(message) {
    if (message.author.bot) return; // Ignore bot messages
  
    if (message.content.startsWith('!chat')) {
      const userMessage = message.content.slice(5).trim(); // Extract the user message after "!chat"
      
      if (!userMessage) {
        return message.reply('❌ Please provide a message for me to respond to!');
      }
  
      try {
        // Request a completion from OpenAI
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo', // You can also use other models (e.g., 'gpt-4')
          messages: [{ role: 'user', content: userMessage }],
        });
  
        // Send the AI's response to the channel
        message.reply(response.choices[0].message.content);
      } catch (error) {
        console.error('Error with OpenAI API:', error);
        message.reply('❌ Something went wrong with the chatbot!');
      }
    }
  }
  
  module.exports = { handleChat };
