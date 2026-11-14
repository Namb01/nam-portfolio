// The words on the Projects, Skills and Contact pages. All of it is filler
// for now: replace each list with the real thing. (The About page's text is
// in src/components/cards/AboutCard.astro, since it's a few paragraphs.)

// Projects page: one tile each.
export const PROJECTS = [
  {
    name: "Project One",
    stack: "React / Node.js / MongoDB",
    blurb: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.",
  },
  {
    name: "Project Two",
    stack: "Python / AWS",
    blurb: "Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.",
  },
  {
    name: "Project Three",
    stack: "JavaScript / Astro",
    blurb: "Curabitur blandit tempus porttitor. Nullam quis risus eget urna mollis ornare vel eu leo.",
  },
];

export const SKILLS = [
  {
    name: "Frontend",
    items: ["React", "Vue.js", "JavaScript", "TypeScript", "HTML", "CSS", "Bootstrap"],
    blurb: "Building interactive and user-friendly interfaces."
  },
  {
    name: "Backend",
    items: ["Node.js", "Express.js", "Python", "Flask", "REST APIs"],
    blurb: "Developing server-side applications and APIs."
  },
  {
    name: "Databases",
    items: ["MongoDB", "Mongoose", "PostgreSQL", "SQL"],
    blurb: "Managing data, database design, and data integrity."
  },
  {
    name: "Cloud & Tools",
    items: ["AWS", "Docker", "Git", "GitHub", "Linux", "Railway"],
    blurb: "Working with deployment, development tools, and infrastructure."
  },
  {
    name: "Languages",
    items: ["JavaScript", "TypeScript", "Python", "Java", "C++", "SQL"],
    blurb: "Using different languages to solve problems and build software."
  },
  {
    name: "Core Concepts",
    items: ["Data Structures & Algorithms", "OOP", "Software Engineering", "User Authentication", "Access Control"],
    blurb: "Applying computer science fundamentals to software development."
  }
];

// Contact page: one row each. `value` is what's shown; `href` is where it
// goes when clicked (mailto: opens a new email).
export const CONTACTS = [
  { label: "Email", value: "namlbui.dev@gmail.com", href: "mailto:namlbui.dev@gmail.com" },
  { label: "GitHub", value: "github.com/Namb01", href: "https://github.com/Namb01" },
  { label: "LinkedIn", value: "linkedin.com/in/namlbui", href: "https://www.linkedin.com/in/namlbui" },
];
