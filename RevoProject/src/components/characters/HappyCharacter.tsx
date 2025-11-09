import React, { useState, useEffect } from 'react';

interface HappyCharacterProps {
  width?: number;
  height?: number;
  isPressed?: boolean;
}

const HappyCharacter: React.FC<HappyCharacterProps> = ({ 
  width = 108, 
  height = 108, 
  isPressed = false 
}) => {
  // 기본 상태
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox="0 0 108 108" fill="none">
      <circle cx="54" cy="54" r="54" fill="#FED046"/>
      <circle cx="26.5359" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      <circle cx="49.3068" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      <mask id="mask0_3091_6694" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="15" y="30" width="23" height="23">
        <circle cx="26.5359" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask0_3091_6694)">
        <circle cx="17.4283" cy="41.8256" r="10.922" fill="#0A0A0A"/>
      </g>
      <mask id="mask1_3091_6694" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="38" y="30" width="23" height="23">
        <circle cx="49.3068" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask1_3091_6694)">
        <circle cx="40.1988" cy="41.8256" r="10.922" fill="#0A0A0A"/>
      </g>
      <circle cx="26.5359" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      <circle cx="49.3068" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      <mask id="mask2_3091_6694" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="15" y="30" width="23" height="23">
        <circle cx="26.5359" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask2_3091_6694)">
        <circle cx="17.4283" cy="41.8256" r="10.922" fill="#0A0A0A"/>
      </g>
      <mask id="mask3_3091_6694" style={{maskType:"alpha"}} maskUnits="userSpaceOnUse" x="38" y="30" width="23" height="23">
        <circle cx="49.3068" cy="41.825" r="10.9213" fill="#F5F5F5"/>
      </mask>
      <g mask="url(#mask3_3091_6694)">
        <circle cx="40.1988" cy="41.8256" r="10.922" fill="#0A0A0A"/>
      </g>
      <path d="M34.4819 52.6988C34.4819 55.9518 40.3374 56.1145 40.3374 52.6988" stroke="#0A0A0A" strokeWidth="1.62651" strokeLinecap="round"/>
      <path d="M30.5782 43.753C30.5782 44.4864 30.2869 45.1897 29.7683 45.7082C29.2498 46.2268 28.5465 46.5181 27.8132 46.5181C27.0798 46.5181 26.3765 46.2268 25.858 45.7082C25.3394 45.1897 25.0481 44.4864 25.0481 43.753L27.8132 43.753H30.5782Z" fill="#F5F5F5"/>
      <path d="M53.3495 43.753C53.3495 44.4864 53.0581 45.1897 52.5396 45.7082C52.021 46.2268 51.3177 46.5181 50.5844 46.5181C49.8511 46.5181 49.1478 46.2268 48.6292 45.7082C48.1107 45.1897 47.8193 44.4864 47.8193 43.753L50.5844 43.753H53.3495Z" fill="#F5F5F5"/>
    </svg>
  );
};

export default HappyCharacter;