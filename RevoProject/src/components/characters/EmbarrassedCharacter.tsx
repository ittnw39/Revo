import React, { useState, useEffect } from 'react';

interface EmbarrassedCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const EmbarrassedCharacter: React.FC<EmbarrassedCharacterProps> = ({ 
  width = 142, 
  height = 142, 
  isPressed = false 
}) => {
  // 기본 상태만 사용
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 135 158" fill="none">
      <path d="M59.75 48.6935C65.7454 37.0058 83.1941 39.8182 85.2137 52.7977C86.1168 58.6023 90.655 63.1652 96.4546 64.1C109.423 66.1902 112.14 83.654 100.42 89.5856C95.1785 92.2383 92.2413 97.9643 93.1445 103.769C95.164 116.748 79.3946 124.729 70.1316 115.416C65.9891 111.251 59.6356 110.227 54.3942 112.879C42.674 118.811 30.2107 106.279 36.2061 94.5917C38.8873 89.3648 37.8978 83.0059 33.7553 78.8407C24.4923 69.5271 32.559 53.8014 45.5273 55.8916C51.3269 56.8264 57.0688 53.9204 59.75 48.6935Z" fill="#F99841"/>
      <circle cx="7.02116" cy="7.02116" r="7.02116" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 84.1521 68.5591)" fill="#F5F5F5"/>
      <circle cx="7.02116" cy="7.02116" r="7.02116" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 69.6995 66.2297)" fill="#F5F5F5"/>
      <mask id="mask0_3154_1411" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="69" y="67" width="15" height="15">
        <circle cx="7.02116" cy="7.02116" r="7.02116" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 84.1521 68.5591)" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_3154_1411)">
        <circle cx="7.02158" cy="7.02158" r="7.02158" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 89.9331 69.4908)" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_3154_1411" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="54" y="65" width="15" height="15">
        <circle cx="7.02116" cy="7.02116" r="7.02116" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 69.6995 66.2297)" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_3154_1411)">
        <circle cx="7.02158" cy="7.02158" r="7.02158" transform="matrix(-0.987259 -0.159124 -0.159124 0.987259 75.4805 67.1614)" fill="#0A0A0A"/>
      </g>
      <mask id="path-8-inside-1_3154_1411" fill="white">
        <path d="M66.0518 81.3387C65.8508 79.3752 66.6945 77.6802 67.9359 77.553C69.1774 77.4259 70.3469 78.9149 70.5479 80.8785L66.0518 81.3387Z"/>
      </mask>
      <path d="M66.0518 81.3387C65.8508 79.3752 66.6945 77.6802 67.9359 77.553C69.1774 77.4259 70.3469 78.9149 70.5479 80.8785L66.0518 81.3387Z" fill="#0A0A0A"/>
      <path d="M66.0518 81.3387L65.6256 81.3823L65.6692 81.8085L66.0954 81.7649L66.0518 81.3387ZM67.9359 77.553L67.8923 77.1268L67.8922 77.1268L67.9359 77.553ZM70.5479 80.8785L70.5915 81.3047L71.0177 81.2611L70.9741 80.8349L70.5479 80.8785ZM66.0518 81.3387L66.478 81.2951C66.3845 80.3814 66.5369 79.5501 66.8365 78.9481C67.139 78.3404 67.5565 78.0226 67.9796 77.9792L67.9359 77.553L67.8922 77.1268C67.0739 77.2107 66.4489 77.8039 66.0694 78.5664C65.6871 79.3346 65.5182 80.3325 65.6256 81.3823L66.0518 81.3387ZM67.9359 77.553L67.9795 77.9792C68.4027 77.9359 68.8759 78.1625 69.2951 78.6964C69.7105 79.2252 70.0281 80.0084 70.1216 80.9222L70.5479 80.8785L70.9741 80.8349C70.8666 79.7851 70.499 78.842 69.969 78.1671C69.443 77.4973 68.7107 77.043 67.8923 77.1268L67.9359 77.553ZM70.5479 80.8785L70.5042 80.4523L66.0082 80.9125L66.0518 81.3387L66.0954 81.7649L70.5915 81.3047L70.5479 80.8785Z" fill="black" mask="url(#path-8-inside-1_3154_1411)"/>
      <path d="M62.8135 73.2753C62.7385 73.7407 62.4816 74.1573 62.0995 74.4334C61.7173 74.7094 61.2411 74.8224 60.7757 74.7474C60.3102 74.6724 59.8936 74.4155 59.6176 74.0334C59.3415 73.6512 59.2285 73.175 59.3036 72.7096L61.0585 72.9924L62.8135 73.2753Z" fill="#F5F5F5"/>
      <path d="M77.2661 75.6047C77.1911 76.0701 76.9343 76.4867 76.5521 76.7628C76.1699 77.0389 75.6938 77.1518 75.2283 77.0768C74.7629 77.0018 74.3463 76.7449 74.0702 76.3628C73.7941 75.9806 73.6812 75.5044 73.7562 75.039L75.5112 75.3218L77.2661 75.6047Z" fill="#F5F5F5"/>
    </svg>
  );
};

const JumpingEmbarrassedCharacter = () => {
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
              transform: translateY(0) scaleY(0.96) scaleX(1.02) rotate(-9deg);
            }
            /* 도약 준비 */
            8% {
              transform: translateY(0) scaleY(0.92) scaleX(1.04) rotate(-7deg);
            }
            /* 점프: 위로 올라가면서 늘어남 (stretch) */
            20% {
              transform: translateY(-8px) scaleY(1.04) scaleX(0.98) rotate(-5deg);
            }
            /* 계속 상승 */
            35% {
              transform: translateY(-35px) scaleY(1.06) scaleX(0.97) rotate(-3deg);
            }
            /* 공중 정점 */
            50% {
              transform: translateY(-45px) scaleY(1.01) scaleX(0.99) rotate(-2deg);
            }
            /* 하강 시작: 다시 늘어남 */
            60% {
              transform: translateY(-35px) scaleY(1.05) scaleX(0.98) rotate(-1deg);
            }
            /* 착지 직전 */
            65% {
              transform: translateY(-8px) scaleY(1.07) scaleX(0.96) rotate(0deg);
            }
            /* 착지: 찌그러짐 (squash) + 수평으로 회전 */
            66% {
              transform: translateY(0) scaleY(0.88) scaleX(1.08) rotate(0deg);
            }
            /* 착지 충격 흡수 */
            73% {
              transform: translateY(0) scaleY(0.94) scaleX(1.03) rotate(-2deg);
            }
            /* 복귀: 통통 튀어오름 */
            80% {
              transform: translateY(0) scaleY(1.02) scaleX(0.99) rotate(-6deg);
            }
            /* 정상 상태로 */
            90% {
              transform: translateY(0) scaleY(0.99) scaleX(1.01) rotate(-8deg);
            }
            /* 다음 점프 준비 */
            100% {
              transform: translateY(0) scaleY(0.96) scaleX(1.02) rotate(-9deg);
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
        <EmbarrassedCharacter width={220} height={220} isPressed={false} />
      </div>
    </div>
  );
};

export default EmbarrassedCharacter;
export { JumpingEmbarrassedCharacter };
