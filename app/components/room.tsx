export default function Room() {
  return (
    <svg
      className="room"
      viewBox="0 0 800 440"
      role="img"
      aria-label="A cozy green therapy couch with cushions, a warm floor lamp, plant, and a small side table"
    >
      <defs>
        <pattern id="wall" width="12" height="12" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="3" r=".6" fill="#cbbb9d" opacity=".3" />
        </pattern>
        <linearGradient id="sofa" x2="0" y2="1">
          <stop stopColor="#7c8d70" />
          <stop offset="1" stopColor="#526c51" />
        </linearGradient>
      </defs>
      <path d="M70 380V60Q400-25 730 60V380" fill="#ece6d8" />
      <path d="M70 380V60Q400-25 730 60V380" fill="url(#wall)" />
      <path d="M100 330H700" stroke="#d8cbb5" strokeWidth="2" />
      <ellipse cx="410" cy="376" rx="310" ry="42" fill="#d9bd9f" />
      <ellipse
        cx="410"
        cy="376"
        rx="281"
        ry="32"
        fill="none"
        stroke="#e8d4b9"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <g stroke="#81664b" strokeWidth="7" strokeLinecap="round">
        <path d="M620 331V121M590 334H650" />
        <path d="M190 343L183 372M523 343L530 372" />
      </g>
      <path d="M581 79H659L680 144H560Z" fill="#e3ba78" />
      <path
        d="M593 83L582 138M610 83L607 139M630 83L635 139M649 83L662 138"
        stroke="#f2d39d"
        strokeWidth="3"
      />
      <ellipse cx="620" cy="145" rx="60" ry="8" fill="#f5dfac" />
      <path
        d="M205 219Q202 163 251 163H469Q513 163 513 217V304H205Z"
        fill="url(#sofa)"
      />
      <path d="M355 177V278" stroke="#52684d" strokeWidth="2" />
      <path
        d="M183 258Q156 227 154 265V326Q154 350 185 350H527Q554 350 554 326V265Q552 227 524 258L510 296H200Z"
        fill="#60785b"
      />
      <rect x="199" y="271" width="157" height="48" rx="15" fill="#879777" />
      <rect x="359" y="271" width="155" height="48" rx="15" fill="#819371" />
      <path d="M203 328H512" stroke="#445e45" strokeWidth="3" />
      <rect
        x="226"
        y="213"
        width="72"
        height="62"
        rx="12"
        fill="#dcc6a2"
        transform="rotate(-12 262 244)"
      />
      <path
        d="M238 232L280 257M245 221L287 247"
        stroke="#be9c76"
        strokeWidth="3"
      />
      <rect
        x="425"
        y="211"
        width="63"
        height="62"
        rx="12"
        fill="#c28b6e"
        transform="rotate(11 455 242)"
      />
      <g>
        <ellipse cx="660" cy="297" rx="46" ry="10" fill="#a37c55" />
        <path
          d="M630 302L625 350M690 302L697 350"
          stroke="#896548"
          strokeWidth="5"
        />
        <path d="M653 273H676L672 291H657Z" fill="#faf0da" />
        <path
          d="M676 277Q690 275 678 285"
          fill="none"
          stroke="#faf0da"
          strokeWidth="3"
        />
        <path
          d="M665 268Q658 262 666 256"
          fill="none"
          stroke="#b8a78d"
          strokeWidth="2"
        />
      </g>
      <path d="M110 293H146L140 334H117Z" fill="#bb8567" />
      <g fill="#738465">
        <ellipse
          cx="113"
          cy="253"
          rx="12"
          ry="30"
          transform="rotate(-35 113 253)"
        />
        <ellipse
          cx="139"
          cy="257"
          rx="12"
          ry="28"
          transform="rotate(30 139 257)"
        />
        <ellipse cx="126" cy="233" rx="10" ry="30" />
      </g>
      <path d="M127 291V238" stroke="#526b4c" strokeWidth="3" />
      <rect x="325" y="66" width="83" height="68" rx="2" fill="#ac8059" />
      <rect x="333" y="74" width="67" height="52" fill="#f7ecd8" />
      <path
        d="M345 112L363 88L378 108L388 96"
        fill="none"
        stroke="#8b9a76"
        strokeWidth="3"
      />
      <circle cx="383" cy="86" r="6" fill="#d4a579" />
    </svg>
  );
}
