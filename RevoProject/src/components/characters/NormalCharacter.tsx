import React from 'react';

interface NormalCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const NormalCharacter: React.FC<NormalCharacterProps> = ({ 
  width = 77, 
  height = 77, 
  isPressed = false 
}) => {
  // 기본 상태만 사용
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 71 71" fill="none">
      <path d="M32.9573 2.09183C34.4735 0.99028 36.5265 0.990282 38.0427 2.09183L66.2443 22.5815C67.7605 23.6831 68.3949 25.6356 67.8158 27.418L57.0437 60.571C56.4646 62.3533 54.8036 63.5601 52.9296 63.5601H18.0704C16.1964 63.5601 14.5354 62.3533 13.9563 60.571L3.18423 27.418C2.60511 25.6356 3.23953 23.6831 4.75569 22.5815L32.9573 2.09183Z" fill="#5CC463"/>
      <line x1="33.8925" y1="35.566" x2="37.1077" y2="35.566" stroke="#0A0A0A" strokeWidth="1.0105" strokeLinecap="round"/>
      <circle cx="29.0828" cy="26.0715" r="6.16827" fill="#F5F5F5"/>
      <circle cx="41.9437" cy="26.0715" r="6.16827" fill="#F5F5F5"/>
      <mask id="mask0_3154_1503" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="22" y="19" width="14" height="14">
        <circle cx="29.0828" cy="26.0715" r="6.16827" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_3154_1503)">
        <circle cx="23.9387" cy="26.072" r="6.16863" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_3154_1503" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="35" y="19" width="14" height="14">
        <circle cx="41.9437" cy="26.0715" r="6.16827" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_3154_1503)">
        <circle cx="36.7995" cy="26.072" r="6.16863" fill="#0A0A0A"/>
      </g>
      <path d="M31.1824 26.9768C31.1824 27.3909 31.0179 27.7882 30.725 28.081C30.4322 28.3739 30.0349 28.5384 29.6208 28.5384C29.2066 28.5384 28.8094 28.3739 28.5165 28.081C28.2236 27.7882 28.0591 27.3909 28.0591 26.9768L29.6208 26.9768H31.1824Z" fill="#F5F5F5"/>
      <path d="M44.0433 26.9768C44.0433 27.3909 43.8787 27.7882 43.5859 28.081C43.293 28.3739 42.8958 28.5384 42.4816 28.5384C42.0674 28.5384 41.6702 28.3739 41.3773 28.081C41.0845 27.7882 40.9199 27.3909 40.9199 26.9768L42.4816 26.9768H44.0433Z" fill="#F5F5F5"/>
    </svg>
  );
};

const JumpingNormalCharacter = () => {
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
          @keyframes bounce {
            /* 시작: 살짝 찌그러짐 (anticipation) */
            0% {
              transform: translateY(0) scale(0.98);
            }
            /* 도약 준비 */
            8% {
              transform: translateY(0) scale(0.96);
            }
            /* 점프: 위로 올라가면서 커짐 */
            20% {
              transform: translateY(-8px) scale(1.02);
            }
            /* 계속 상승 */
            35% {
              transform: translateY(-35px) scale(1.04);
            }
            /* 공중 정점 */
            50% {
              transform: translateY(-45px) scale(1.0);
            }
            /* 하강 시작 */
            60% {
              transform: translateY(-35px) scale(1.02);
            }
            /* 착지 직전 */
            65% {
              transform: translateY(-8px) scale(1.03);
            }
            /* 착지: 작아짐 */
            66% {
              transform: translateY(0) scale(0.92);
            }
            /* 착지 충격 흡수 */
            73% {
              transform: translateY(0) scale(0.95);
            }
            /* 복귀: 커지면서 복귀 */
            80% {
              transform: translateY(0) scale(1.01);
            }
            /* 정상 상태로 */
            90% {
              transform: translateY(0) scale(1.0);
            }
            /* 다음 점프 준비 */
            100% {
              transform: translateY(0) scale(0.98);
            }
          }

          .character-wrapper {
            animation: bounce 1.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            transform-origin: center bottom;
            transition: none;
          }
          
          .character-wrapper svg {
            display: block;
          }
        `}
      </style>
      <div className="character-wrapper">
        <NormalCharacter width={200} height={200} isPressed={false} />
      </div>
    </div>
  );
};

export default NormalCharacter;
export { JumpingNormalCharacter };
