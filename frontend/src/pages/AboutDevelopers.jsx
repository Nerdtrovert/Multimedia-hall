import "./AboutDevelopers.css";

const developers = [
  {
    name: "Prajwal Navada G P",
    usn: "1HC24CS058",
    // photo: "/developers/prajwal.jpg",
    points: [
      "Seamless frontend-backend routing with reliable database connectivity",
      "PWA implementation with push notifications and mailing integration",
      "Calendar module fixes with overall system enhancements",
    ],
  },
  {
    name: "Meenal Lepakshi",
    usn: "1HC24AD016",
    // photo: "/developers/meenal.jpg",
    points: [
      "Added login UI with background & logo",
      "Fixed calendar styling and auth flow",
      "Resolved merge conflicts",
    ],
  },
  {
    name: "Pruthvi Raj G",
    usn: "1HC24CS000",
    // photo: "/developers/pruthvi.jpg",
    points: [
      "Navbar inclusion with Name and logo",
      "Report generation in Excel",
    ],
  },
  {
    name: "Aaron Chirag",
    usn: "1HC24CS002",
    // photo: "/developers/aaron.jpg",
    points: ["Frontend suggestions", "Color scheme suggestions"],
  },
];

function AboutDevelopers() {
  return (
    <div className="page about-page">
      <div className="page-header">
        <h2>Developers</h2>
        <p>Team members who worked on this project.</p>
      </div>

      <div className="about-grid">
        {developers.map((developer) => (
          <article className="about-card card" key={developer.usn}>
            {developer.photo ? (
              <img 
                src={developer.photo} 
                alt={`${developer.name}'s photo`} 
                className="about-photo"
              />
            ) : (
              <div className="about-photo-placeholder">Photo</div>
            )}
            <div className="about-details">
              <h3>{developer.name}</h3>
              <p className="about-usn">{developer.usn}</p>
              <ul className="about-points">
                {developer.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default AboutDevelopers;
