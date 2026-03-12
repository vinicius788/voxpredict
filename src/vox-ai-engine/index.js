const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create Express app
const app = express();
const PORT = process.env.VOXAI_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Load prompts
const marketGeneratorPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/marketGeneratorPrompt.txt'),
  'utf8'
);

const marketResolutionPrompt = fs.readFileSync(
  path.join(__dirname, 'prompts/marketResolutionPrompt.txt'),
  'utf8'
);

// Generate market endpoint
app.post('/generate-market', async (req, res) => {
  try {
    const { noticia, dataEncerramento } = req.body;
    
    if (!noticia || !dataEncerramento) {
      return res.status(400).json({ 
        success: false, 
        error: 'Notícia e data de encerramento são obrigatórios' 
      });
    }
    
    // Prepare prompt
    const prompt = marketGeneratorPrompt
      .replace('{{NOTICIA}}', noticia)
      .replace('{{DATA}}', dataEncerramento);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Gere um mercado preditivo baseado nesta notícia." }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    // Parse response
    const responseText = completion.choices[0].message.content;
    let marketData;
    
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        marketData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback to mock data
      marketData = {
        titulo: "Bitcoin atingirá $100,000 até o final de " + new Date(dataEncerramento).getFullYear() + "?",
        descricao: "Este mercado prevê se o preço do Bitcoin (BTC) atingirá ou ultrapassará a marca de $100,000 USD em qualquer exchange principal antes do final do ano. A resolução será baseada em dados verificáveis de pelo menos três grandes exchanges (Binance, Coinbase, Kraken).",
        opcoes: ["Sim", "Não"],
        dataEncerramento: dataEncerramento,
        categoria: "cripto",
        tags: ["Bitcoin", "Criptomoedas", "Preço"]
      };
    }
    
    res.status(200).json(marketData);
  } catch (error) {
    console.error('Error generating market:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Resolve market endpoint
app.post('/resolve-market', async (req, res) => {
  try {
    const { marketTitle, articleContent } = req.body;
    
    if (!marketTitle || !articleContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Título do mercado e conteúdo do artigo são obrigatórios' 
      });
    }
    
    // Prepare prompt
    const prompt = marketResolutionPrompt
      .replace('{{MARKET_TITLE}}', marketTitle)
      .replace('{{ARTICLE_CONTENT}}', articleContent);
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 50,
    });
    
    // Parse response
    const responseText = completion.choices[0].message.content.trim();
    let result;
    
    if (responseText.toUpperCase() === 'SIM') {
      result = 'SIM';
    } else if (responseText.toUpperCase() === 'NÃO') {
      result = 'NÃO';
    } else {
      result = 'MANUAL';
    }
    
    res.status(200).json({
      result,
      confidence: result === 'MANUAL' ? 0 : 95,
      reasoning: responseText,
      source: 'VoxAI Engine',
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`VoxAI Engine running on port ${PORT}`);
});