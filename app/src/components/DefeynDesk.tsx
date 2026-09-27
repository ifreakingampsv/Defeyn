/**
 * DefeynDesk: original cobalt/cream duotone illustration (drawn for Defeyn —
 * not copied from any site). A learning desk drawn like an architect's drafting
 * sheet, in the style language of the reference: dense scene, hard light with
 * long shadows, wall notes, grain overlay. Palette: cobalt #3b60c5, deep cobalt
 * #22398a, paper #f2e7cd, white, ink lines.
 */
export default function DefeynDesk({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 560"
      className={className}
      role="img"
      aria-label="Illustration of a learning desk: a student drafts a course plan beside a window with a city skyline; course cards float above the desk and an isometric building of course modules rises from a blueprint sheet."
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <filter id="dd-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>

      {/* backdrop: deep cobalt wall + cream floor */}
      <rect width="1200" height="560" fill="#2c4a9e" />
      <polygon points="640,0 1200,0 1200,340" fill="#3b60c5" />
      <rect x="0" y="402" width="1200" height="158" fill="#e9dcbe" />
      <polygon points="0,402 1200,402 1200,462 0,514" fill="#f2e7cd" />

      {/* hard light beam from the window */}
      <polygon points="20,52 372,52 640,470 120,470" fill="#dfe7f6" opacity="0.14" />

      {/* window + skyline */}
      <rect x="26" y="38" width="336" height="336" fill="#dfe7f6" />
      <rect x="26" y="38" width="336" height="336" fill="none" stroke="#1b2f70" strokeWidth="11" />
      <line x1="194" y1="38" x2="194" y2="374" stroke="#1b2f70" strokeWidth="9" />
      <line x1="26" y1="205" x2="362" y2="205" stroke="#1b2f70" strokeWidth="6" />
      <g fill="#93a7dc">
        <rect x="38" y="196" width="48" height="178" />
        <rect x="92" y="152" width="36" height="222" />
        <rect x="134" y="212" width="54" height="162" />
        <polygon points="200,146 236,114 272,146 272,374 200,374" />
        <rect x="278" y="184" width="42" height="190" />
        <rect x="326" y="232" width="30" height="142" />
      </g>
      <g fill="#3b60c5">
        <rect x="58" y="258" width="62" height="116" />
        <rect x="128" y="288" width="46" height="86" />
        <rect x="206" y="238" width="32" height="136" />
        <rect x="244" y="298" width="74" height="76" />
        <rect x="322" y="268" width="34" height="106" />
      </g>
      {/* lit windows on the front skyline */}
      <g fill="#dfe7f6">
        <rect x="66" y="268" width="7" height="9" />
        <rect x="80" y="268" width="7" height="9" />
        <rect x="66" y="286" width="7" height="9" />
        <rect x="94" y="286" width="7" height="9" />
        <rect x="214" y="250" width="6" height="8" />
        <rect x="226" y="250" width="6" height="8" />
        <rect x="254" y="308" width="7" height="9" />
        <rect x="270" y="308" width="7" height="9" />
        <rect x="330" y="280" width="6" height="8" />
      </g>
      {/* clouds */}
      <g fill="#ffffff">
        <ellipse cx="92" cy="84" rx="36" ry="12" />
        <ellipse cx="124" cy="73" rx="24" ry="9" />
        <ellipse cx="286" cy="118" rx="30" ry="10" />
        <ellipse cx="312" cy="108" rx="18" ry="7" />
      </g>

      {/* pinned notes on the wall (right of window) */}
      <g>
        <rect x="470" y="66" width="74" height="92" fill="#f2e7cd" transform="rotate(-3 507 112)" />
        <rect x="560" y="58" width="80" height="100" fill="#ffffff" transform="rotate(2 600 108)" />
        <circle cx="600" cy="66" r="3.5" fill="#22398a" />
        <rect x="572" y="84" width="56" height="6" fill="#c9d6ee" transform="rotate(2 600 108)" />
        <rect x="572" y="98" width="44" height="6" fill="#c9d6ee" transform="rotate(2 600 108)" />
        <rect x="660" y="70" width="66" height="84" fill="#f2e7cd" transform="rotate(4 693 112)" />
        <circle cx="693" cy="78" r="3.5" fill="#22398a" />
      </g>

      {/* shelf with objects (far right wall) */}
      <g>
        <rect x="1032" y="92" width="148" height="10" fill="#1b2f70" />
        <rect x="1050" y="50" width="22" height="42" fill="#16295f" />
        <rect x="1054" y="56" width="14" height="30" fill="#3b60c5" />
        <rect x="1080" y="58" width="16" height="34" fill="#dfe7f6" />
        <rect x="1104" y="42" width="24" height="50" fill="#16295f" />
        <circle cx="1152" cy="72" r="15" fill="#dfe7f6" />
        <circle cx="1152" cy="72" r="7" fill="#22398a" />
      </g>

      {/* drafting desk */}
      <polygon points="232,338 1014,338 1068,472 194,472" fill="#f2e7cd" />
      <polygon points="232,338 1014,338 1014,354 232,354" fill="#ffffff" />
      {/* long hard shadows across the floor */}
      <polygon points="194,472 560,472 760,560 420,560" fill="#dccfa9" opacity="0.8" />
      <polygon points="700,472 1068,472 1200,560 940,560" fill="#dccfa9" opacity="0.55" />
      {/* desk legs + drawer unit */}
      <polygon points="246,472 272,472 264,552 236,552" fill="#e0d2b2" />
      <polygon points="954,472 982,472 994,552 962,552" fill="#e0d2b2" />
      <rect x="300" y="470" width="110" height="78" fill="#3b60c5" />
      <rect x="300" y="470" width="110" height="10" fill="#2c4a9e" />
      <rect x="352" y="494" width="16" height="8" fill="#dfe7f6" />
      <rect x="820" y="472" width="90" height="60" fill="#e0d2b2" />
      {/* stool */}
      <g>
        <rect x="548" y="494" width="96" height="13" fill="#3b60c5" />
        <rect x="560" y="507" width="13" height="45" fill="#2c4a9e" />
        <rect x="618" y="507" width="13" height="45" fill="#2c4a9e" />
      </g>

      {/* desk clutter: mug, pen holder, books, ruler */}
      <g>
        <rect x="392" y="300" width="30" height="38" rx="4" fill="#3b60c5" />
        <path d="M422 308c12 2 12 18 0 20" stroke="#3b60c5" strokeWidth="5" fill="none" />
        <rect x="700" y="288" width="34" height="44" fill="#16295f" />
        <line x1="708" y1="292" x2="702" y2="266" stroke="#dfe7f6" strokeWidth="4" strokeLinecap="round" />
        <line x1="718" y1="292" x2="722" y2="262" stroke="#3b60c5" strokeWidth="4" strokeLinecap="round" />
        <line x1="728" y1="292" x2="734" y2="268" stroke="#dfe7f6" strokeWidth="4" strokeLinecap="round" />
        <g>
          <rect x="960" y="322" width="92" height="12" fill="#16295f" />
          <rect x="966" y="310" width="80" height="12" fill="#3b60c5" />
          <rect x="972" y="298" width="68" height="12" fill="#22398a" />
        </g>
        <rect x="300" y="330" width="120" height="8" fill="#c9d6ee" transform="rotate(-8 360 334)" />
      </g>

      {/* big blueprint on the desk */}
      <g transform="rotate(-2 620 396)">
        <rect x="418" y="352" width="380" height="102" fill="#ffffff" stroke="#22398a" strokeWidth="2.5" />
        <g fill="none" stroke="#3b60c5" strokeWidth="2">
          <rect x="438" y="368" width="96" height="64" />
          <rect x="546" y="368" width="74" height="36" />
          <rect x="546" y="412" width="74" height="20" />
          <rect x="632" y="368" width="60" height="64" />
          <line x1="704" y1="368" x2="704" y2="432" />
          <line x1="438" y1="406" x2="534" y2="406" />
          <line x1="546" y1="390" x2="620" y2="390" />
        </g>
        <circle cx="748" cy="400" r="10" fill="#3b60c5" />
        <path d="M748 400c11-7 20-2 22 7" stroke="#3b60c5" strokeWidth="2.5" fill="none" />
        <path d="M470 380l14 8-14 8z" fill="#3b60c5" />
      </g>

      {/* isometric course building on its own sheet (right) */}
      <g>
        <polygon points="868,354 1002,320 1136,354 1002,390" fill="#dfe7f6" stroke="#22398a" strokeWidth="2.5" />
        {/* tower: two stacked masses with window mullions */}
        <g stroke="#22398a" strokeWidth="1.5">
          <polygon points="916,322 968,309 968,262 916,275" fill="#c9d6ee" />
          <polygon points="968,309 1020,321 1020,274 968,262" fill="#dfe7f6" />
          <polygon points="916,275 968,262 968,228 916,241" fill="#b4c5ea" />
          <polygon points="968,262 1020,274 1020,240 968,228" fill="#c9d6ee" />
          <line x1="929" y1="279" x2="929" y2="318" />
          <line x1="942" y1="276" x2="942" y2="315" />
          <line x1="955" y1="272" x2="955" y2="311" />
          <line x1="981" y1="266" x2="981" y2="305" />
          <line x1="994" y1="269" x2="994" y2="308" />
          <line x1="1007" y1="272" x2="1007" y2="311" />
          <line x1="929" y1="245" x2="929" y2="272" />
          <line x1="942" y1="242" x2="942" y2="269" />
          <line x1="981" y1="232" x2="981" y2="259" />
          <line x1="994" y1="235" x2="994" y2="262" />
        </g>
        {/* roof cap */}
        <polygon points="916,241 968,228 1020,240 968,253" fill="#ffffff" stroke="#22398a" strokeWidth="1.5" />
        {/* door on the sheet */}
        <rect x="986" y="352" width="26" height="20" fill="#3b60c5" />
      </g>

      {/* floating course cards */}
      <g>
        <g transform="rotate(-4 762 128)">
          <rect x="700" y="92" width="124" height="74" fill="#ffffff" stroke="#22398a" strokeWidth="2" />
          <rect x="713" y="106" width="46" height="9" fill="#3b60c5" />
          <rect x="713" y="123" width="98" height="5" fill="#c9d6ee" />
          <rect x="713" y="135" width="82" height="5" fill="#c9d6ee" />
          <rect x="713" y="147" width="90" height="5" fill="#c9d6ee" />
        </g>
        <g transform="rotate(3 926 176)">
          <rect x="872" y="144" width="110" height="66" fill="#ffffff" stroke="#22398a" strokeWidth="2" />
          <circle cx="894" cy="164" r="9" fill="#3b60c5" />
          <rect x="910" y="156" width="60" height="6" fill="#c9d6ee" />
          <rect x="910" y="168" width="48" height="6" fill="#c9d6ee" />
          <rect x="884" y="184" width="74" height="5" fill="#c9d6ee" />
        </g>
      </g>

      {/* student seen from behind, seated on the stool */}
      <g>
        {/* chair back */}
        <rect x="462" y="322" width="126" height="158" rx="12" fill="#f2e7cd" stroke="#22398a" strokeWidth="3" />
        <rect x="462" y="322" width="126" height="36" rx="12" fill="#e9dcbe" />
        <rect x="496" y="480" width="17" height="74" fill="#2c4a9e" />
        <rect x="540" y="480" width="17" height="60" fill="#2c4a9e" />
        {/* torso with hatching */}
        <path d="M486 350c0-32 21-50 40-50s39 18 39 50l-7 104h-65z" fill="#3b60c5" />
        <g stroke="#2c4a9e" strokeWidth="1.6" opacity="0.7">
          <line x1="500" y1="316" x2="492" y2="440" />
          <line x1="514" y1="308" x2="510" y2="444" />
          <line x1="528" y1="306" x2="528" y2="446" />
          <line x1="542" y1="310" x2="547" y2="440" />
        </g>
        {/* head, ear + bun */}
        <circle cx="525" cy="280" r="25" fill="#3b60c5" />
        <path d="M500 268a25 25 0 0 1 42-10" fill="#2c4a9e" />
        <circle cx="524" cy="252" r="11" fill="#16295f" />
        <path d="M548 284c5 2 8 6 8 11" stroke="#16295f" strokeWidth="3" fill="none" />
        {/* glasses arm */}
        <path d="M546 280l14-4" stroke="#16295f" strokeWidth="3" strokeLinecap="round" />
        {/* arm + hand with pen on the sheet */}
        <path d="M556 346c44-10 84-6 106 12l-9 17c-24-14-58-16-88-9z" fill="#2c4a9e" />
        <circle cx="659" cy="370" r="10" fill="#f2e7cd" stroke="#22398a" strokeWidth="2" />
        <line x1="662" y1="364" x2="678" y2="344" stroke="#16295f" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* plant right */}
      <g>
        <polygon points="1116,474 1200,474 1200,560 1104,560" fill="#dfe7f6" />
        <path d="M1158 474c-4-44 10-76 30-96-2 38-10 68-16 96z" fill="#3b60c5" />
        <path d="M1146 474c-18-32-20-62-10-90 13 28 18 60 20 90z" fill="#2c4a9e" />
        <path d="M1170 474c14-26 34-42 52-46-12 24-30 40-44 46z" fill="#16295f" />
        <path d="M1140 474c-2-20 2-36 10-48 4 16 2 32-2 48z" fill="#3b60c5" />
      </g>

      {/* grain overlay for the screen-print texture */}
      <rect width="1200" height="560" filter="url(#dd-grain)" opacity="0.07" />
    </svg>
  );
}
