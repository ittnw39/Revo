import React from 'react';

interface ExciteCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const ExciteCharacter: React.FC<ExciteCharacterProps> = ({ 
  width = 108, 
  height = 108, 
  isPressed = false 
}) => {
  // 기본 상태 (위로 튀어오를 때)만 사용
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 104 103" fill="none">
      <path d="M31.6371 17.2491C31.3903 16.361 32.5187 15.7545 33.1232 16.4503L47.2132 32.6674C47.605 33.1183 48.3251 33.0457 48.619 32.5256L59.1886 13.8226C59.6421 13.0201 60.8688 13.3892 60.8043 14.3087L59.3002 35.7389C59.2584 36.3349 59.8189 36.7927 60.3945 36.6328L81.0934 30.8816C81.9814 30.6348 82.5879 31.7632 81.8921 32.3677L65.6751 46.4577C65.2242 46.8495 65.2967 47.5696 65.8168 47.8635L84.5199 58.4331C85.3223 58.8866 84.9533 60.1133 84.0338 60.0488L62.6035 58.5447C62.0076 58.5029 61.5497 59.0634 61.7097 59.639L67.4609 80.3378C67.7077 81.2259 66.5793 81.8324 65.9747 81.1366L51.8848 64.9196C51.493 64.4686 50.7729 64.5412 50.4789 65.0613L39.9094 83.7643C39.4559 84.5668 38.2292 84.1977 38.2937 83.2783L39.7978 61.848C39.8396 61.2521 39.279 60.7942 38.7035 60.9541L18.0046 66.7054C17.1165 66.9521 16.5101 65.8237 17.2058 65.2192L33.4229 51.1292C33.8738 50.7374 33.8012 50.0173 33.2812 49.7234L14.5781 39.1539C13.7757 38.7004 14.1447 37.4736 15.0642 37.5382L36.4945 39.0422C37.0904 39.0841 37.5482 38.5235 37.3883 37.948L31.6371 17.2491Z" fill="#EE47CA"/>
      <circle cx="39.7646" cy="46.1617" r="7.08666" transform="rotate(-28.2567 39.7646 46.1617)" fill="#F5F5F5"/>
      <circle cx="52.7795" cy="39.1665" r="7.08666" transform="rotate(-28.2567 52.7795 39.1665)" fill="#F5F5F5"/>
      <mask id="mask0_3154_1466" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="32" y="39" width="15" height="15">
        <circle cx="39.7646" cy="46.1617" r="7.08666" transform="rotate(-28.2567 39.7646 46.1617)" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_3154_1466)">
        <circle cx="34.5592" cy="48.96" r="7.08707" transform="rotate(-28.2567 34.5592 48.96)" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_3154_1466" style={{maskType: 'alpha'}} maskUnits="userSpaceOnUse" x="45" y="32" width="15" height="15">
        <circle cx="52.7795" cy="39.1665" r="7.08666" transform="rotate(-28.2567 52.7795 39.1665)" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_3154_1466)">
        <circle cx="47.5743" cy="41.9646" r="7.08707" transform="rotate(-28.2567 47.5743 41.9646)" fill="#0A0A0A"/>
      </g>
      <path d="M42.0097 46.1357C42.235 46.5548 42.2845 47.0463 42.1474 47.502C42.0104 47.9577 41.6979 48.3402 41.2787 48.5655C40.8596 48.7908 40.3681 48.8403 39.9124 48.7032C39.4568 48.5661 39.0742 48.2537 38.8489 47.8345L40.4293 46.9851L42.0097 46.1357Z" fill="#F5F5F5"/>
      <path d="M55.0246 39.1405C55.2499 39.5597 55.2994 40.0512 55.1623 40.5068C55.0253 40.9625 54.7128 41.3451 54.2936 41.5703C53.8745 41.7956 53.383 41.8452 52.9273 41.7081C52.4717 41.571 52.0891 41.2585 51.8638 40.8394L53.4442 39.9899L55.0246 39.1405Z" fill="#F5F5F5"/>
      <mask id="path-10-inside-1_3154_1466" fill="white">
        <path d="M50.5017 47.3876C50.8368 49.3296 50.1133 51.0757 48.8855 51.2876C47.6577 51.4992 46.3908 50.0967 46.0557 48.1548L50.5017 47.3876Z"/>
      </mask>
      <path d="M50.5017 47.3876C50.8368 49.3296 50.1133 51.0757 48.8855 51.2876C47.6577 51.4992 46.3908 50.0967 46.0557 48.1548L50.5017 47.3876Z" fill="#0A0A0A"/>
      <path d="M50.5017 47.3876L50.9278 47.3141L50.8543 46.888L50.4281 46.9615L50.5017 47.3876ZM48.8855 51.2876L48.9589 51.7138L48.959 51.7138L48.8855 51.2876ZM46.0557 48.1548L45.9821 47.7287L45.556 47.8022L45.6295 48.2284L46.0557 48.1548ZM50.5017 47.3876L50.0755 47.4612C50.2314 48.3641 50.1368 49.2017 49.8802 49.8209C49.6211 50.446 49.2283 50.7896 48.8119 50.8615L48.8855 51.2876L48.959 51.7138C49.7705 51.5737 50.3533 50.9383 50.6792 50.152C51.0075 49.3596 51.1071 48.3531 50.9278 47.3141L50.5017 47.3876ZM48.8855 51.2876L48.812 50.8615C48.3957 50.9332 47.9103 50.7411 47.4567 50.2389C47.0074 49.7415 46.6376 48.9842 46.4818 48.0813L46.0557 48.1548L45.6295 48.2284C45.8088 49.2673 46.24 50.1822 46.8149 50.8186C47.3855 51.4503 48.1475 51.8536 48.9589 51.7138L48.8855 51.2876ZM46.0557 48.1548L46.1292 48.581L50.5752 47.8138L50.5017 47.3876L50.4281 46.9615L45.9821 47.7287L46.0557 48.1548Z" fill="black" mask="url(#path-10-inside-1_3154_1466)"/>
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
