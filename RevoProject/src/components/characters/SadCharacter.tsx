import React from 'react';

interface SadCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const SadCharacter: React.FC<SadCharacterProps> = ({ 
  width = 41, 
  height = 89, 
  isPressed = false 
}) => {
  // 기본 상태만 사용
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 41 90" fill="none">
      <rect y="0.112366" width="41" height="88.9053" rx="2.58947" fill="#47AFF4"/>
      <circle cx="12.1939" cy="10.6637" r="7.77297" fill="#F5F5F5"/>
      <circle cx="28.4004" cy="10.6637" r="7.77297" fill="#F5F5F5"/>
      <mask id="mask0_3154_1337" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="4" y="2" width="16" height="17">
        <circle cx="12.1939" cy="10.6637" r="7.77297" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_3154_1337)">
        <circle cx="18.2139" cy="10.6641" r="7.77342" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_3154_1337" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="20" y="2" width="17" height="17">
        <circle cx="28.4004" cy="10.6637" r="7.77297" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_3154_1337)">
        <circle cx="33.9575" cy="10.6641" r="7.77342" fill="#0A0A0A"/>
      </g>
      <rect x="6.50439" y="14.2354" width="5.7881" height="33.6352" rx="2.89405" fill="#F5F5F5"/>
      <rect x="28.7307" y="15.856" width="4.74737" height="14.7963" rx="2.37368" fill="#F5F5F5"/>
      <path d="M22.4797 20.1829C22.4797 17.8676 18.3123 17.7519 18.3123 20.1829" stroke="#0A0A0A" strokeWidth="1.15762" strokeLinecap="round"/>
      <path d="M12.7531 12.2674C12.7531 12.7893 12.5457 13.2899 12.1767 13.6589C11.8076 14.028 11.307 14.2354 10.7851 14.2354C10.2632 14.2354 9.76262 14.028 9.39356 13.6589C9.0245 13.2899 8.81716 12.7893 8.81716 12.2674L10.7851 12.2674H12.7531Z" fill="#F5F5F5"/>
      <path d="M28.7308 12.2674C28.7308 12.7893 28.5235 13.2899 28.1544 13.6589C27.7854 14.028 27.2848 14.2353 26.7629 14.2353C26.2409 14.2353 25.7404 14.028 25.3713 13.6589C25.0023 13.2899 24.7949 12.7893 24.7949 12.2674L26.7629 12.2674H28.7308Z" fill="#F5F5F5"/>
    </svg>
  );
};

const JumpingSadCharacter = () => {
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
          @keyframes slowBounce {
            /* 시작 */
            0% {
              transform: translateY(0) scaleY(1.0);
            }
            /* 도약 준비: 살짝 줄어듦 */
            8% {
              transform: translateY(0) scaleY(0.95);
            }
            /* 점프: 위로 올라가면서 길어짐 */
            20% {
              transform: translateY(-8px) scaleY(1.05);
            }
            /* 계속 상승: 길어진 상태 유지 */
            35% {
              transform: translateY(-35px) scaleY(1.08);
            }
            /* 공중 정점: 길어진 상태 */
            50% {
              transform: translateY(-45px) scaleY(1.06);
            }
            /* 하강 시작: 여전히 길어짐 */
            60% {
              transform: translateY(-35px) scaleY(1.08);
            }
            /* 착지 직전: 길어진 상태 */
            65% {
              transform: translateY(-8px) scaleY(1.05);
            }
            /* 착지: 급격히 줄어듦 */
            66% {
              transform: translateY(0) scaleY(0.92);
            }
            /* 착지 후 복귀 */
            72% {
              transform: translateY(0) scaleY(1.0);
            }
            /* 다음 점프 준비 */
            100% {
              transform: translateY(0) scaleY(1.0);
            }
          }

          .character-wrapper {
            animation: slowBounce 1.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
            transform-origin: center bottom;
            transition: none;
          }
          
          .character-wrapper svg {
            display: block;
          }
        `}
      </style>
      <div className="character-wrapper">
        <SadCharacter width={200} height={440} isPressed={false} />
      </div>
    </div>
  );
};

export default SadCharacter;
export { JumpingSadCharacter };
