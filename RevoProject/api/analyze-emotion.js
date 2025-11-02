// api/analyze-emotion.js
export default async function handler(req, res) {
  // CORS 설정 (중요!)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONS 요청 처리 (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};

  // 텍스트 검증
  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: '텍스트가 비어있습니다' });
  }

  try {
    // OpenAI API 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 빠르고 저렴한 모델
        messages: [{
          role: 'system',
          content: '당신은 한국어 텍스트의 감정을 분석하는 전문가입니다. 주어진 텍스트에서 6가지 감정(기쁨, 슬픔, 분노, 보통, 신남, 당황) 중 주요 감정을 판단하고, 각 감정과 관련된 단어들을 추출합니다. 반드시 JSON 형식으로만 답변하세요.'
        }, {
          role: 'user',
          content: `다음 텍스트를 분석해서 감정을 분류해줘.

감정 카테고리: 기쁨, 슬픔, 분노, 보통, 신남, 당황

텍스트: "${text}"

반드시 아래 JSON 형식으로만 답변해줘. 다른 설명은 절대 포함하지 마:
{
  "mainEmotion": "주요 감정 하나만 (기쁨/슬픔/분노/보통/신남/당황 중 하나)",
  "emotionWords": {
    "기쁨": ["텍스트에서 발견된 기쁨 관련 단어들"],
    "슬픔": ["텍스트에서 발견된 슬픔 관련 단어들"],
    "분노": ["텍스트에서 발견된 분노 관련 단어들"],
    "보통": ["텍스트에서 발견된 보통 관련 단어들"],
    "신남": ["텍스트에서 발견된 신남 관련 단어들"],
    "당황": ["텍스트에서 발견된 당황 관련 단어들"]
  }
}

예시:
텍스트: "오늘 친구들이랑 놀러가서 너무 재밌었어! 신나는 하루였다"
결과:
{
  "mainEmotion": "기쁨",
  "emotionWords": {
    "기쁨": ["재밌었어", "즐거운"],
    "신남": ["신나는"],
    "슬픔": [],
    "분노": [],
    "보통": [],
    "당황": []
  }
}`
        }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const data = await response.json();
    
    // 오류 체크
    if (data.error) {
      console.error('OpenAI API Error:', data.error);
      throw new Error(data.error.message);
    }
    
    // JSON 파싱
    const result = JSON.parse(data.choices[0].message.content);
    
    // 결과 검증
    const validEmotions = ['기쁨', '슬픔', '분노', '보통', '신남', '당황'];
    if (!validEmotions.includes(result.mainEmotion)) {
      result.mainEmotion = '보통'; // 기본값
    }
    
    console.log('감정 분석 결과:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('감정 분석 오류:', error);
    res.status(500).json({ 
      error: '감정 분석 실패', 
      message: error.message 
    });
  }
}

