import React from 'react';

interface ExciteCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const ExciteCharacter: React.FC<ExciteCharacterProps> = ({ 
  width = 140, 
  height = 140, 
  isPressed = false 
}) => {
  // 기본 상태 (위로 튀어오를 때)만 사용
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 112 130" fill="none">
      <path d="M52.3928 48.9594C52.6228 48.1064 53.833 48.1064 54.063 48.9594L58.7928 66.5057C58.9373 67.0415 59.5418 67.3046 60.0324 67.045L78.0801 57.495C78.8973 57.0626 79.7317 58.0416 79.1753 58.78L68.1811 73.3692C67.7953 73.8811 68.0811 74.6202 68.711 74.7394L88.7385 78.5303C89.6771 78.708 89.6771 80.0522 88.7385 80.2298L68.7109 84.0207C68.0811 84.1399 67.7953 84.879 68.1811 85.391L79.1753 99.9802C79.7317 100.719 78.8973 101.698 78.0801 101.265L60.0324 91.7151C59.5418 91.4556 58.9373 91.7186 58.7928 92.2545L54.063 109.801C53.833 110.654 52.6228 110.654 52.3928 109.801L47.663 92.2545C47.5186 91.7186 46.914 91.4556 46.4234 91.7151L28.3757 101.265C27.5585 101.698 26.7241 100.719 27.2805 99.9802L38.2747 85.391C38.6605 84.879 38.3747 84.1399 37.7449 84.0207L17.7174 80.2298C16.7787 80.0522 16.7787 78.708 17.7174 78.5303L37.7449 74.7394C38.3747 74.6202 38.6605 73.8811 38.2747 73.3692L27.2805 58.78C26.7241 58.0416 27.5585 57.0626 28.3757 57.495L46.4234 67.045C46.914 67.3046 47.5186 67.0415 47.663 66.5057L52.3928 48.9594Z" fill="#EE47CA"/>
      <ellipse cx="45.8555" cy="73.556" rx="7.08666" ry="5.93835" fill="#F5F5F5"/>
      <ellipse cx="60.6311" cy="73.556" rx="7.08666" ry="5.93835" fill="#F5F5F5"/>
      <mask id="mask0_99_883" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="38" y="67" width="15" height="13">
        <ellipse cx="45.8555" cy="73.556" rx="7.08666" ry="5.93835" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_99_883)">
        <ellipse cx="39.9455" cy="73.5564" rx="7.08707" ry="5.9387" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_99_883" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="53" y="67" width="15" height="13">
        <ellipse cx="60.6311" cy="73.556" rx="7.08666" ry="5.93835" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_99_883)">
        <ellipse cx="54.7215" cy="73.5564" rx="7.08707" ry="5.9387" fill="#0A0A0A"/>
      </g>
      <path d="M47.8451 74.4275C47.8451 74.8263 47.6561 75.2087 47.3196 75.4907C46.9831 75.7726 46.5268 75.931 46.0509 75.931C45.5751 75.931 45.1187 75.7726 44.7822 75.4907C44.4457 75.2087 44.2567 74.8263 44.2567 74.4275L46.0509 74.4275H47.8451Z" fill="#F5F5F5"/>
      <path d="M62.6209 74.4275C62.6209 74.8263 62.4318 75.2087 62.0954 75.4907C61.7589 75.7726 61.3025 75.931 60.8267 75.931C60.3508 75.931 59.8945 75.7726 59.558 75.4907C59.2215 75.2087 59.0325 74.8263 59.0325 74.4275L60.8267 74.4275H62.6209Z" fill="#F5F5F5"/>
      <mask id="path-10-inside-1_99_883" fill="white">
        <path d="M54.7331 78.7205C54.1089 80.2868 52.6443 81.2881 51.4625 80.9574C50.281 80.6264 49.829 79.0889 50.4531 77.5228L54.7331 78.7205Z"/>
      </mask>
      <path d="M54.7331 78.7205C54.1089 80.2868 52.6443 81.2881 51.4625 80.9574C50.281 80.6264 49.829 79.0889 50.4531 77.5228L54.7331 78.7205Z" fill="#0A0A0A"/>
      <path d="M54.7331 78.7205L55.1495 78.837L55.3096 78.4353L54.8931 78.3187L54.7331 78.7205ZM51.4625 80.9574L51.3023 81.359L51.3024 81.3591L51.4625 80.9574ZM50.4531 77.5228L50.6132 77.1211L50.1968 77.0046L50.0367 77.4063L50.4531 77.5228ZM54.7331 78.7205L54.3166 78.6039C54.0347 79.3113 53.569 79.8746 53.0645 80.2196C52.5595 80.5649 52.0476 80.6746 51.6226 80.5557L51.4625 80.9574L51.3024 81.3591C52.0592 81.5708 52.8705 81.3452 53.5493 80.881C54.2286 80.4164 54.8072 79.696 55.1495 78.837L54.7331 78.7205ZM51.4625 80.9574L51.6227 80.5557C51.1978 80.4367 50.8675 80.0913 50.7116 79.5611C50.5559 79.0314 50.5877 78.3467 50.8696 77.6394L50.4531 77.5228L50.0367 77.4063C49.6944 78.2651 49.6402 79.1322 49.8498 79.8454C50.0593 80.5582 50.5457 81.1471 51.3023 81.359L51.4625 80.9574ZM50.4531 77.5228L50.293 77.9245L54.573 79.1222L54.7331 78.7205L54.8931 78.3187L50.6132 77.1211L50.4531 77.5228Z" fill="black" mask="url(#path-10-inside-1_99_883)"/>
    </svg>
  );
};

const JumpingExciteCharacter = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#000000',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden'
    }}>
      <style>
        {`
          @keyframes exciteBounce {
            /* 시작: 도약 준비 상태로 시작 */
            0% {
              transform: translateY(0) rotate(0deg) scale(0.95);
            }
            /* 점프: 위로 올라가면서 왼쪽으로 회전하고 커짐 */
            15% {
              transform: translateY(-15px) rotate(-15deg) scale(1.08);
            }
            /* 계속 상승: 왼쪽으로 회전하며 커진 상태 */
            30% {
              transform: translateY(-55px) rotate(-30deg) scale(1.15);
            }
            /* 공중 정점: 최대 왼쪽 회전과 크기 */
            45% {
              transform: translateY(-70px) rotate(-35deg) scale(1.18);
            }
            /* 하강 시작: 오른쪽으로 역회전하며 크기 유지 */
            60% {
              transform: translateY(-55px) rotate(-20deg) scale(1.15);
            }
            /* 착지 직전: 계속 역회전하며 작아지기 시작 */
            70% {
              transform: translateY(-15px) rotate(-5deg) scale(1.05);
            }
            /* 착지: 원래 각도로 복귀하고 작아짐 */
            75% {
              transform: translateY(0) rotate(0deg) scale(0.92);
            }
            /* 바로 다음 점프 준비 */
            85% {
              transform: translateY(0) rotate(0deg) scale(0.94);
            }
            /* 다음 점프 준비 완료 */
            100% {
              transform: translateY(0) rotate(0deg) scale(0.95);
            }
          }

          .character-wrapper {
            animation: exciteBounce 1.0s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            transform-origin: center center;
            transition: none;
          }
          
          .character-wrapper svg {
            display: block;
          }
        `}
      </style>
      <div className="character-wrapper">
        <ExciteCharacter width={250} height={250} isPressed={false} />
      </div>
    </div>
  );
};

export default ExciteCharacter;
export { JumpingExciteCharacter };
