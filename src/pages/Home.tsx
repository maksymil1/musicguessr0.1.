import "./home.css";
import logo from "../assets/logo.png";
import speakerLeft from "../assets/speaker-left.png";
import speakerRight from "../assets/speaker-right.png";
import MenuButton from "../components/MenuButton/MenuButton.tsx";

export default function Home() {
  const buttons = [
    { label: "PLAY", screen: "/tryb" },
    { label: "FRIENDS", screen: "/friends" },
    { label: "EXPLORE", screen: "/search" },
  ] as const;

  return (
    <>
      <div className="home-container">
        <img src={logo} alt="MusicGuessr logo" className="logo" />

        <div className="buttons">
          {buttons.map((btn) => (
            <MenuButton key={btn.label} label={btn.label} to={btn.screen} />
          ))}
        </div>
      </div>

      <div className="speakers-container">
        <div className="speaker-left">
          <img src={speakerLeft} alt="Left speaker" />
        </div>
        <div className="speaker-right">
          <img src={speakerRight} alt="Right speaker" />
        </div>
      </div>
    </>
  );
}
