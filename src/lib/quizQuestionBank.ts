// Local question bank for quiz generation
// This provides a rich set of questions across subjects and difficulty levels

export interface QuizQuestion {
    id: number;
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string;
}

type Difficulty = "easy" | "medium" | "hard";

interface QuestionEntry {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
    difficulty: Difficulty;
    topic: string;
    subject: string;
    keywords: string[];
}

const questionBank: QuestionEntry[] = [
    // ─── Mathematics ────────────────────────────────────────────────────
    { question: "What is the value of π (pi) rounded to two decimal places?", options: ["3.14", "3.16", "3.12", "3.18"], correct: 0, explanation: "Pi (π) is approximately 3.14159, which rounds to 3.14.", difficulty: "easy", topic: "Mathematics", subject: "Mathematics", keywords: ["pi", "math", "constant", "circle"] },
    { question: "What is the square root of 144?", options: ["11", "12", "13", "14"], correct: 1, explanation: "12 × 12 = 144, so the square root of 144 is 12.", difficulty: "easy", topic: "Mathematics", subject: "Mathematics", keywords: ["square root", "math", "arithmetic"] },
    { question: "What is 15% of 200?", options: ["25", "30", "35", "40"], correct: 1, explanation: "15% of 200 = 0.15 × 200 = 30.", difficulty: "easy", topic: "Mathematics", subject: "Mathematics", keywords: ["percentage", "math", "arithmetic"] },
    { question: "What is the formula for the area of a circle?", options: ["πr²", "2πr", "πd", "2πr²"], correct: 0, explanation: "The area of a circle is calculated using A = πr², where r is the radius.", difficulty: "easy", topic: "Mathematics", subject: "Mathematics", keywords: ["area", "circle", "geometry", "formula"] },
    { question: "What is the derivative of x²?", options: ["x", "2x", "2x²", "x³/3"], correct: 1, explanation: "Using the power rule, the derivative of x² is 2x.", difficulty: "medium", topic: "Calculus", subject: "Mathematics", keywords: ["derivative", "calculus", "power rule"] },
    { question: "What is the integral of 2x dx?", options: ["x²", "x² + C", "2x²", "2x² + C"], correct: 1, explanation: "The integral of 2x is x² + C, where C is the constant of integration.", difficulty: "medium", topic: "Calculus", subject: "Mathematics", keywords: ["integral", "calculus", "antiderivative"] },
    { question: "In a right triangle, if one angle is 30°, what is the other acute angle?", options: ["45°", "50°", "60°", "70°"], correct: 2, explanation: "The sum of angles in a triangle is 180°. 180° - 90° - 30° = 60°.", difficulty: "easy", topic: "Geometry", subject: "Mathematics", keywords: ["triangle", "angles", "geometry"] },
    { question: "What is the Pythagorean theorem?", options: ["a² + b² = c²", "a + b = c", "a² × b² = c²", "a² - b² = c²"], correct: 0, explanation: "The Pythagorean theorem states that in a right triangle, the square of the hypotenuse equals the sum of squares of the other two sides: a² + b² = c².", difficulty: "easy", topic: "Geometry", subject: "Mathematics", keywords: ["pythagorean", "theorem", "triangle", "geometry"] },
    { question: "What is the value of log₁₀(1000)?", options: ["2", "3", "4", "10"], correct: 1, explanation: "log₁₀(1000) = 3 because 10³ = 1000.", difficulty: "medium", topic: "Algebra", subject: "Mathematics", keywords: ["logarithm", "algebra", "math"] },
    { question: "What is the sum of the first 10 natural numbers?", options: ["45", "50", "55", "60"], correct: 2, explanation: "Using the formula n(n+1)/2: 10 × 11/2 = 55.", difficulty: "medium", topic: "Mathematics", subject: "Mathematics", keywords: ["sum", "natural numbers", "series", "formula"] },
    { question: "What is the limit of sin(x)/x as x approaches 0?", options: ["0", "1", "∞", "undefined"], correct: 1, explanation: "This is a fundamental limit in calculus: lim(x→0) sin(x)/x = 1.", difficulty: "hard", topic: "Calculus", subject: "Mathematics", keywords: ["limit", "calculus", "trigonometry", "sinx"] },
    { question: "What is the determinant of a 2×2 matrix [[a,b],[c,d]]?", options: ["ad + bc", "ad - bc", "ac - bd", "ac + bd"], correct: 1, explanation: "The determinant of a 2×2 matrix [[a,b],[c,d]] is ad - bc.", difficulty: "hard", topic: "Linear Algebra", subject: "Mathematics", keywords: ["determinant", "matrix", "linear algebra"] },

    // ─── Physics ─────────────────────────────────────────────────────────
    { question: "What is the SI unit of force?", options: ["Joule", "Watt", "Newton", "Pascal"], correct: 2, explanation: "The SI unit of force is the Newton (N), named after Sir Isaac Newton.", difficulty: "easy", topic: "Physics", subject: "Physics", keywords: ["force", "unit", "newton", "physics"] },
    { question: "What is the speed of light in vacuum?", options: ["3 × 10⁶ m/s", "3 × 10⁸ m/s", "3 × 10¹⁰ m/s", "3 × 10⁴ m/s"], correct: 1, explanation: "The speed of light in vacuum is approximately 3 × 10⁸ meters per second.", difficulty: "easy", topic: "Physics", subject: "Physics", keywords: ["light", "speed", "electromagnetic", "physics"] },
    { question: "What does Newton's second law state?", options: ["F = ma", "F = mv", "F = m/a", "F = m²a"], correct: 0, explanation: "Newton's second law states that Force equals mass times acceleration: F = ma.", difficulty: "easy", topic: "Mechanics", subject: "Physics", keywords: ["newton", "force", "acceleration", "mechanics"] },
    { question: "What is the unit of electrical resistance?", options: ["Ampere", "Volt", "Ohm", "Watt"], correct: 2, explanation: "The unit of electrical resistance is the Ohm (Ω), named after Georg Ohm.", difficulty: "easy", topic: "Electricity", subject: "Physics", keywords: ["resistance", "ohm", "electricity", "unit"] },
    { question: "What is Ohm's Law?", options: ["V = IR", "V = I/R", "V = I²R", "V = R/I"], correct: 0, explanation: "Ohm's Law states that Voltage equals Current times Resistance: V = IR.", difficulty: "medium", topic: "Electricity", subject: "Physics", keywords: ["ohm", "voltage", "current", "resistance", "electricity"] },
    { question: "What type of energy does a moving object possess?", options: ["Potential energy", "Kinetic energy", "Thermal energy", "Chemical energy"], correct: 1, explanation: "A moving object possesses kinetic energy, which is given by KE = ½mv².", difficulty: "easy", topic: "Energy", subject: "Physics", keywords: ["kinetic", "energy", "motion", "physics"] },
    { question: "What is the formula for gravitational potential energy?", options: ["mgh", "½mv²", "Fd", "kx²/2"], correct: 0, explanation: "Gravitational potential energy is calculated as PE = mgh, where m is mass, g is gravitational acceleration, and h is height.", difficulty: "medium", topic: "Energy", subject: "Physics", keywords: ["potential energy", "gravity", "height", "physics"] },
    { question: "What is the first law of thermodynamics?", options: ["Energy cannot be created or destroyed", "Entropy always increases", "Absolute zero is unattainable", "Heat flows from hot to cold"], correct: 0, explanation: "The first law of thermodynamics states that energy cannot be created or destroyed, only transformed from one form to another.", difficulty: "medium", topic: "Thermodynamics", subject: "Physics", keywords: ["thermodynamics", "energy", "conservation", "physics"] },
    { question: "What is the wavelength of red light approximately?", options: ["400 nm", "520 nm", "620-750 nm", "800 nm"], correct: 2, explanation: "Red light has a wavelength of approximately 620-750 nanometers.", difficulty: "medium", topic: "Optics", subject: "Physics", keywords: ["wavelength", "light", "red", "optics", "electromagnetic"] },
    { question: "What is the photoelectric effect?", options: ["Light reflecting off metal", "Electrons emitted when light hits metal", "Light bending through glass", "Light splitting into colors"], correct: 1, explanation: "The photoelectric effect is the emission of electrons when light (photons) of sufficient energy strikes a metallic surface.", difficulty: "hard", topic: "Quantum Physics", subject: "Physics", keywords: ["photoelectric", "electrons", "photons", "quantum"] },
    { question: "What is the de Broglie wavelength formula?", options: ["λ = h/p", "λ = h/E", "λ = p/h", "λ = E/h"], correct: 0, explanation: "The de Broglie wavelength is λ = h/p, where h is Planck's constant and p is momentum.", difficulty: "hard", topic: "Quantum Physics", subject: "Physics", keywords: ["de broglie", "wavelength", "quantum", "momentum"] },

    // ─── Chemistry ───────────────────────────────────────────────────────
    { question: "What is the chemical symbol for gold?", options: ["Go", "Gd", "Au", "Ag"], correct: 2, explanation: "Gold's chemical symbol is Au, from the Latin word 'aurum'.", difficulty: "easy", topic: "Chemistry", subject: "Chemistry", keywords: ["gold", "element", "symbol", "periodic table"] },
    { question: "What is the pH of pure water?", options: ["5", "6", "7", "8"], correct: 2, explanation: "Pure water has a pH of 7, which is neutral — neither acidic nor basic.", difficulty: "easy", topic: "Chemistry", subject: "Chemistry", keywords: ["pH", "water", "neutral", "acid", "base"] },
    { question: "What is the chemical formula for table salt?", options: ["NaCl", "KCl", "CaCl₂", "MgCl₂"], correct: 0, explanation: "Table salt is sodium chloride, with the chemical formula NaCl.", difficulty: "easy", topic: "Chemistry", subject: "Chemistry", keywords: ["salt", "sodium", "chloride", "formula"] },
    { question: "How many elements are in the periodic table (as of 2024)?", options: ["108", "112", "118", "120"], correct: 2, explanation: "There are 118 confirmed elements in the periodic table.", difficulty: "easy", topic: "Chemistry", subject: "Chemistry", keywords: ["elements", "periodic table", "chemistry"] },
    { question: "What type of bond involves sharing electrons?", options: ["Ionic bond", "Covalent bond", "Metallic bond", "Hydrogen bond"], correct: 1, explanation: "A covalent bond involves the sharing of electron pairs between atoms.", difficulty: "medium", topic: "Chemical Bonds", subject: "Chemistry", keywords: ["covalent", "bond", "electrons", "sharing"] },
    { question: "What is Avogadro's number?", options: ["6.022 × 10²³", "6.022 × 10²²", "3.14 × 10²³", "6.022 × 10²⁴"], correct: 0, explanation: "Avogadro's number is 6.022 × 10²³, representing the number of particles in one mole of substance.", difficulty: "medium", topic: "Chemistry", subject: "Chemistry", keywords: ["avogadro", "mole", "number", "chemistry"] },
    { question: "What is the molecular formula for glucose?", options: ["C₆H₁₂O₆", "C₆H₆O₆", "C₁₂H₂₂O₁₁", "CH₂O"], correct: 0, explanation: "Glucose has the molecular formula C₆H₁₂O₆.", difficulty: "medium", topic: "Organic Chemistry", subject: "Chemistry", keywords: ["glucose", "molecular formula", "organic", "sugar"] },
    { question: "What is the process of breaking down molecules with water called?", options: ["Dehydration", "Hydrolysis", "Oxidation", "Reduction"], correct: 1, explanation: "Hydrolysis is the process of breaking chemical bonds by adding water.", difficulty: "medium", topic: "Chemistry", subject: "Chemistry", keywords: ["hydrolysis", "water", "reaction", "chemistry"] },
    { question: "What is the electron configuration of carbon?", options: ["1s² 2s² 2p²", "1s² 2s² 2p⁴", "1s² 2s² 2p⁶", "1s² 2s¹ 2p³"], correct: 0, explanation: "Carbon (atomic number 6) has the electron configuration 1s² 2s² 2p².", difficulty: "hard", topic: "Atomic Structure", subject: "Chemistry", keywords: ["electron configuration", "carbon", "atomic structure"] },
    { question: "What is the principle of Le Chatelier?", options: ["Energy is conserved", "Systems shift to counteract disturbances", "Entropy always increases", "Reactions reach equilibrium"], correct: 1, explanation: "Le Chatelier's Principle states that a system at equilibrium will shift to counteract any disturbance applied to it.", difficulty: "hard", topic: "Chemical Equilibrium", subject: "Chemistry", keywords: ["le chatelier", "equilibrium", "chemistry", "shift"] },

    // ─── Biology ─────────────────────────────────────────────────────────
    { question: "What is the powerhouse of the cell?", options: ["Nucleus", "Ribosome", "Mitochondria", "Golgi apparatus"], correct: 2, explanation: "Mitochondria are called the powerhouse of the cell because they generate ATP, the cell's energy currency.", difficulty: "easy", topic: "Cell Biology", subject: "Biology", keywords: ["mitochondria", "cell", "energy", "atp", "biology"] },
    { question: "What molecule carries genetic information?", options: ["RNA", "DNA", "Protein", "Lipid"], correct: 1, explanation: "DNA (Deoxyribonucleic Acid) carries the genetic information in most organisms.", difficulty: "easy", topic: "Genetics", subject: "Biology", keywords: ["dna", "genetics", "heredity", "biology"] },
    { question: "What is the process by which plants make food using sunlight?", options: ["Respiration", "Fermentation", "Photosynthesis", "Decomposition"], correct: 2, explanation: "Photosynthesis is the process by which green plants use sunlight to synthesize glucose from carbon dioxide and water.", difficulty: "easy", topic: "Photosynthesis", subject: "Biology", keywords: ["photosynthesis", "plants", "sunlight", "biology"] },
    { question: "How many chromosomes do humans have?", options: ["23", "44", "46", "48"], correct: 2, explanation: "Humans have 46 chromosomes (23 pairs), with 22 pairs of autosomes and 1 pair of sex chromosomes.", difficulty: "easy", topic: "Genetics", subject: "Biology", keywords: ["chromosomes", "human", "genetics", "biology"] },
    { question: "What is the largest organ in the human body?", options: ["Liver", "Brain", "Skin", "Heart"], correct: 2, explanation: "The skin is the largest organ in the human body, covering about 1.5-2 square meters in adults.", difficulty: "easy", topic: "Human Body", subject: "Biology", keywords: ["organ", "skin", "human body", "biology"] },
    { question: "What is the basic unit of life?", options: ["Atom", "Molecule", "Cell", "Organ"], correct: 2, explanation: "The cell is the basic structural and functional unit of all living organisms.", difficulty: "easy", topic: "Cell Biology", subject: "Biology", keywords: ["cell", "life", "basic unit", "biology"] },
    { question: "What is natural selection?", options: ["Random mutation", "Survival of the fittest", "Genetic drift", "Gene flow"], correct: 1, explanation: "Natural selection, proposed by Darwin, is the process where organisms better adapted to their environment tend to survive and reproduce more.", difficulty: "medium", topic: "Evolution", subject: "Biology", keywords: ["natural selection", "evolution", "darwin", "adaptation"] },
    { question: "What are the four bases in DNA?", options: ["A, T, G, C", "A, U, G, C", "A, T, G, U", "A, B, G, C"], correct: 0, explanation: "The four bases in DNA are Adenine (A), Thymine (T), Guanine (G), and Cytosine (C).", difficulty: "medium", topic: "Genetics", subject: "Biology", keywords: ["dna", "bases", "nucleotides", "genetics"] },
    { question: "What is the role of mRNA in protein synthesis?", options: ["It transports amino acids", "It carries genetic code from DNA to ribosomes", "It forms ribosomes", "It cuts introns"], correct: 1, explanation: "mRNA (messenger RNA) carries the genetic code from DNA in the nucleus to ribosomes in the cytoplasm for protein synthesis.", difficulty: "hard", topic: "Molecular Biology", subject: "Biology", keywords: ["mrna", "protein synthesis", "transcription", "ribosomes"] },
    { question: "What is CRISPR-Cas9 used for?", options: ["Cell imaging", "Gene editing", "Protein folding", "DNA sequencing"], correct: 1, explanation: "CRISPR-Cas9 is a revolutionary gene-editing tool that allows scientists to precisely modify DNA sequences in organisms.", difficulty: "hard", topic: "Genetics", subject: "Biology", keywords: ["crispr", "gene editing", "cas9", "biotechnology"] },

    // ─── History ─────────────────────────────────────────────────────────
    { question: "In what year did World War II end?", options: ["1943", "1944", "1945", "1946"], correct: 2, explanation: "World War II ended in 1945 with the surrender of Germany in May and Japan in August.", difficulty: "easy", topic: "World War II", subject: "History", keywords: ["world war", "ww2", "1945", "history"] },
    { question: "Who was the first President of the United States?", options: ["Thomas Jefferson", "John Adams", "George Washington", "Benjamin Franklin"], correct: 2, explanation: "George Washington served as the first President of the United States from 1789 to 1797.", difficulty: "easy", topic: "American History", subject: "History", keywords: ["president", "washington", "america", "history"] },
    { question: "When did the French Revolution begin?", options: ["1776", "1789", "1799", "1815"], correct: 1, explanation: "The French Revolution began in 1789 with the storming of the Bastille on July 14.", difficulty: "easy", topic: "French Revolution", subject: "History", keywords: ["french revolution", "1789", "bastille", "france"] },
    { question: "Who built the Great Wall of China?", options: ["Ming Dynasty only", "Multiple dynasties over centuries", "Qin Dynasty only", "Han Dynasty only"], correct: 1, explanation: "The Great Wall was built over many centuries by multiple Chinese dynasties, starting from the 7th century BC.", difficulty: "medium", topic: "Ancient History", subject: "History", keywords: ["great wall", "china", "dynasties", "ancient"] },
    { question: "What ancient civilization built the pyramids at Giza?", options: ["Romans", "Greeks", "Egyptians", "Persians"], correct: 2, explanation: "The ancient Egyptians built the pyramids at Giza around 2580-2560 BC as tombs for the pharaohs.", difficulty: "easy", topic: "Ancient History", subject: "History", keywords: ["pyramids", "giza", "egypt", "ancient"] },
    { question: "What was the Cold War?", options: ["A war fought in cold regions", "A geopolitical rivalry between the US and USSR", "A war in Antarctica", "A trade war between Europe and Asia"], correct: 1, explanation: "The Cold War (1947-1991) was a geopolitical rivalry between the United States and the Soviet Union, characterized by political tension, proxy wars, and nuclear arms race.", difficulty: "medium", topic: "Cold War", subject: "History", keywords: ["cold war", "us", "ussr", "geopolitics", "nuclear"] },
    { question: "When was the Declaration of Independence signed?", options: ["1774", "1775", "1776", "1777"], correct: 2, explanation: "The Declaration of Independence was signed on July 4, 1776, marking the birth of the United States.", difficulty: "easy", topic: "American History", subject: "History", keywords: ["declaration", "independence", "1776", "america"] },
    { question: "What event triggered World War I?", options: ["Bombing of Pearl Harbor", "Assassination of Archduke Franz Ferdinand", "Invasion of Poland", "Sinking of the Lusitania"], correct: 1, explanation: "The assassination of Archduke Franz Ferdinand of Austria-Hungary in Sarajevo on June 28, 1914, triggered the start of World War I.", difficulty: "medium", topic: "World War I", subject: "History", keywords: ["world war 1", "ww1", "franz ferdinand", "assassination"] },
    { question: "What was the significance of the Magna Carta?", options: ["It established democracy", "It limited the power of the king", "It abolished slavery", "It created parliament"], correct: 1, explanation: "The Magna Carta (1215) was significant because it limited the power of the English king and established that no one, including the king, was above the law.", difficulty: "hard", topic: "Medieval History", subject: "History", keywords: ["magna carta", "king", "law", "medieval", "england"] },

    // ─── Geography ───────────────────────────────────────────────────────
    { question: "What is the largest continent by area?", options: ["Africa", "North America", "Asia", "Europe"], correct: 2, explanation: "Asia is the largest continent, covering about 44.58 million square kilometers.", difficulty: "easy", topic: "Geography", subject: "Geography", keywords: ["continent", "asia", "largest", "geography"] },
    { question: "What is the longest river in the world?", options: ["Amazon", "Nile", "Mississippi", "Yangtze"], correct: 1, explanation: "The Nile River is traditionally considered the longest river at approximately 6,650 km.", difficulty: "easy", topic: "Geography", subject: "Geography", keywords: ["river", "nile", "longest", "geography"] },
    { question: "What is the deepest ocean trench?", options: ["Tonga Trench", "Philippine Trench", "Mariana Trench", "Java Trench"], correct: 2, explanation: "The Mariana Trench is the deepest known oceanic trench, reaching a depth of about 10,994 meters.", difficulty: "medium", topic: "Geography", subject: "Geography", keywords: ["ocean", "trench", "mariana", "deepest"] },
    { question: "Which country has the most time zones?", options: ["Russia", "United States", "France", "China"], correct: 2, explanation: "France has the most time zones (12) due to its overseas territories around the world.", difficulty: "hard", topic: "Geography", subject: "Geography", keywords: ["time zones", "france", "countries", "geography"] },
    { question: "What is the largest desert in the world?", options: ["Sahara", "Arabian", "Antarctic", "Gobi"], correct: 2, explanation: "Antarctica is the largest desert by area (about 14 million km²). The Sahara is the largest hot desert.", difficulty: "medium", topic: "Geography", subject: "Geography", keywords: ["desert", "largest", "antarctica", "sahara"] },
    { question: "What is the capital of Australia?", options: ["Sydney", "Melbourne", "Canberra", "Brisbane"], correct: 2, explanation: "Canberra is the capital of Australia, chosen as a compromise between Sydney and Melbourne.", difficulty: "easy", topic: "Geography", subject: "Geography", keywords: ["capital", "australia", "canberra", "geography"] },

    // ─── Computer Science ────────────────────────────────────────────────
    { question: "What does CPU stand for?", options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Computer Processing Unit"], correct: 0, explanation: "CPU stands for Central Processing Unit — the primary component that executes instructions in a computer.", difficulty: "easy", topic: "Computer Science", subject: "Computer Science", keywords: ["cpu", "processor", "computer", "hardware"] },
    { question: "What is the binary representation of the number 10?", options: ["1000", "1010", "1100", "1001"], correct: 1, explanation: "The decimal number 10 in binary is 1010 (8 + 0 + 2 + 0).", difficulty: "easy", topic: "Computer Science", subject: "Computer Science", keywords: ["binary", "number system", "conversion", "computer science"] },
    { question: "What data structure uses FIFO (First In, First Out)?", options: ["Stack", "Queue", "Tree", "Graph"], correct: 1, explanation: "A Queue uses the FIFO principle — the first element added is the first one removed.", difficulty: "medium", topic: "Data Structures", subject: "Computer Science", keywords: ["queue", "fifo", "data structure", "computer science"] },
    { question: "What is the time complexity of binary search?", options: ["O(n)", "O(n²)", "O(log n)", "O(1)"], correct: 2, explanation: "Binary search has O(log n) time complexity because it halves the search space with each comparison.", difficulty: "medium", topic: "Algorithms", subject: "Computer Science", keywords: ["binary search", "time complexity", "algorithm", "log n"] },
    { question: "What does HTML stand for?", options: ["Hyper Text Markup Language", "High Tech Modern Language", "Hyper Transfer Markup Language", "Home Tool Markup Language"], correct: 0, explanation: "HTML stands for HyperText Markup Language, the standard language for creating web pages.", difficulty: "easy", topic: "Web Development", subject: "Computer Science", keywords: ["html", "web", "markup language", "internet"] },
    { question: "What is an API?", options: ["A Programming Interface", "Application Programming Interface", "Automated Program Integration", "Application Process Interface"], correct: 1, explanation: "API stands for Application Programming Interface — a set of rules that allow software applications to communicate.", difficulty: "easy", topic: "Software Engineering", subject: "Computer Science", keywords: ["api", "interface", "software", "programming"] },
    { question: "What is the difference between a compiler and an interpreter?", options: ["Compilers are faster", "Compilers translate all at once, interpreters line by line", "Interpreters are more accurate", "No difference"], correct: 1, explanation: "A compiler translates the entire source code at once into machine code, while an interpreter translates and executes code line by line.", difficulty: "medium", topic: "Programming Languages", subject: "Computer Science", keywords: ["compiler", "interpreter", "programming", "translation"] },
    { question: "What is Big O notation used for?", options: ["Measuring code quality", "Describing algorithm efficiency", "Counting bugs", "Measuring memory usage only"], correct: 1, explanation: "Big O notation describes the upper bound of an algorithm's time or space complexity as input size grows.", difficulty: "medium", topic: "Algorithms", subject: "Computer Science", keywords: ["big o", "complexity", "algorithm", "efficiency"] },
    { question: "What is recursion in programming?", options: ["A loop that runs forever", "A function calling itself", "A type of variable", "A sorting algorithm"], correct: 1, explanation: "Recursion is when a function calls itself to solve a problem by breaking it into smaller subproblems.", difficulty: "medium", topic: "Programming", subject: "Computer Science", keywords: ["recursion", "function", "programming", "self-referential"] },
    { question: "What is a deadlock in operating systems?", options: ["A crashed program", "Two processes waiting for each other indefinitely", "A memory leak", "A buffer overflow"], correct: 1, explanation: "A deadlock occurs when two or more processes are waiting for each other to release resources, creating a circular dependency that prevents progress.", difficulty: "hard", topic: "Operating Systems", subject: "Computer Science", keywords: ["deadlock", "operating system", "processes", "concurrency"] },

    // ─── Economics ───────────────────────────────────────────────────────
    { question: "What is GDP?", options: ["General Domestic Product", "Gross Domestic Product", "Gross Domestic Profit", "General Domestic Profit"], correct: 1, explanation: "GDP stands for Gross Domestic Product — the total value of goods and services produced in a country over a specific time period.", difficulty: "easy", topic: "Economics", subject: "Economics", keywords: ["gdp", "economy", "production", "macroeconomics"] },
    { question: "What is inflation?", options: ["Decrease in prices", "Increase in general price levels", "Economic recession", "Currency appreciation"], correct: 1, explanation: "Inflation is the sustained increase in the general price level of goods and services over time, reducing purchasing power.", difficulty: "easy", topic: "Economics", subject: "Economics", keywords: ["inflation", "prices", "economy", "purchasing power"] },
    { question: "What is the law of supply and demand?", options: ["Supply always exceeds demand", "Higher prices lead to higher demand", "When demand increases prices tend to rise", "Supply is always constant"], correct: 2, explanation: "The law of supply and demand states that when demand for a product increases (while supply stays constant), the price tends to rise, and vice versa.", difficulty: "medium", topic: "Microeconomics", subject: "Economics", keywords: ["supply", "demand", "price", "market", "economics"] },
    { question: "What is an opportunity cost?", options: ["The cost of a product", "The benefit foregone from the next best alternative", "Tax on imports", "Interest on loans"], correct: 1, explanation: "Opportunity cost is the value of the next best alternative that is given up when making a choice.", difficulty: "medium", topic: "Economics", subject: "Economics", keywords: ["opportunity cost", "choice", "alternative", "economics"] },
    { question: "What is a monopoly?", options: ["Many sellers, one buyer", "One seller, many buyers", "Many sellers, many buyers", "Few sellers, few buyers"], correct: 1, explanation: "A monopoly is a market structure where a single seller dominates the entire market with no close substitutes.", difficulty: "medium", topic: "Market Structures", subject: "Economics", keywords: ["monopoly", "market", "seller", "competition"] },

    // ─── Literature ──────────────────────────────────────────────────────
    { question: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1, explanation: "William Shakespeare wrote 'Romeo and Juliet' around 1594-1596.", difficulty: "easy", topic: "Literature", subject: "Literature", keywords: ["shakespeare", "romeo", "juliet", "drama", "literature"] },
    { question: "What is a sonnet?", options: ["A 12-line poem", "A 14-line poem", "A 16-line poem", "A 10-line poem"], correct: 1, explanation: "A sonnet is a 14-line poem with a specific rhyme scheme, often written in iambic pentameter.", difficulty: "medium", topic: "Poetry", subject: "Literature", keywords: ["sonnet", "poem", "14 lines", "poetry", "literature"] },
    { question: "Who wrote '1984'?", options: ["Aldous Huxley", "Ray Bradbury", "George Orwell", "H.G. Wells"], correct: 2, explanation: "George Orwell wrote '1984', published in 1949, a dystopian novel about totalitarian surveillance.", difficulty: "easy", topic: "Literature", subject: "Literature", keywords: ["1984", "george orwell", "dystopian", "novel"] },
    { question: "What literary device involves giving human qualities to non-human things?", options: ["Metaphor", "Simile", "Personification", "Hyperbole"], correct: 2, explanation: "Personification is a literary device where human qualities are attributed to non-human things or abstract ideas.", difficulty: "medium", topic: "Literary Devices", subject: "Literature", keywords: ["personification", "literary device", "figurative language"] },
    { question: "Who wrote 'To Kill a Mockingbird'?", options: ["Harper Lee", "F. Scott Fitzgerald", "Ernest Hemingway", "John Steinbeck"], correct: 0, explanation: "Harper Lee wrote 'To Kill a Mockingbird', published in 1960, addressing racial injustice in the American South.", difficulty: "easy", topic: "Literature", subject: "Literature", keywords: ["mockingbird", "harper lee", "novel", "american literature"] },

    // ─── Psychology ──────────────────────────────────────────────────────
    { question: "Who is considered the founder of psychoanalysis?", options: ["Carl Jung", "Sigmund Freud", "B.F. Skinner", "Ivan Pavlov"], correct: 1, explanation: "Sigmund Freud is considered the founder of psychoanalysis, developing theories about the unconscious mind.", difficulty: "easy", topic: "Psychology", subject: "Psychology", keywords: ["freud", "psychoanalysis", "psychology", "unconscious"] },
    { question: "What is Maslow's hierarchy of needs?", options: ["A learning theory", "A motivation theory arranged in a pyramid", "A personality test", "A cognitive development theory"], correct: 1, explanation: "Maslow's hierarchy of needs is a motivational theory with five tiers arranged in a pyramid: physiological, safety, love/belonging, esteem, and self-actualization.", difficulty: "medium", topic: "Psychology", subject: "Psychology", keywords: ["maslow", "hierarchy", "needs", "motivation", "psychology"] },
    { question: "What is classical conditioning?", options: ["Learning through rewards", "Learning through association of stimuli", "Learning by observation", "Learning through trial and error"], correct: 1, explanation: "Classical conditioning, discovered by Pavlov, is learning through the association of a neutral stimulus with a meaningful stimulus.", difficulty: "medium", topic: "Behavioral Psychology", subject: "Psychology", keywords: ["classical conditioning", "pavlov", "learning", "stimulus"] },
    { question: "What does the term 'cognitive dissonance' mean?", options: ["Memory loss", "Mental discomfort from conflicting beliefs", "Learning disability", "Sleep disorder"], correct: 1, explanation: "Cognitive dissonance is the mental discomfort felt when holding two or more contradictory beliefs, values, or attitudes simultaneously.", difficulty: "medium", topic: "Social Psychology", subject: "Psychology", keywords: ["cognitive dissonance", "beliefs", "conflict", "psychology"] },
    { question: "What is the placebo effect?", options: ["A drug side effect", "Improvement from believing a treatment works", "A type of allergy", "A cognitive bias"], correct: 1, explanation: "The placebo effect occurs when a patient experiences improvement simply because they believe they are receiving treatment, even if the treatment is inactive.", difficulty: "medium", topic: "Psychology", subject: "Psychology", keywords: ["placebo", "effect", "treatment", "belief", "psychology"] },

    // ─── Engineering ─────────────────────────────────────────────────────
    { question: "What is stress in engineering?", options: ["Emotional pressure", "Force per unit area", "Strain per unit length", "Energy per unit volume"], correct: 1, explanation: "In engineering, stress is defined as force per unit area (σ = F/A), measured in Pascals.", difficulty: "medium", topic: "Mechanical Engineering", subject: "Engineering", keywords: ["stress", "force", "area", "mechanical engineering"] },
    { question: "What is the difference between AC and DC current?", options: ["AC is faster", "AC changes direction, DC flows one way", "DC is more powerful", "No difference"], correct: 1, explanation: "AC (Alternating Current) periodically reverses direction, while DC (Direct Current) flows in one direction only.", difficulty: "easy", topic: "Electrical Engineering", subject: "Engineering", keywords: ["ac", "dc", "current", "electrical engineering"] },
    { question: "What is torque?", options: ["Linear force", "Rotational force", "Friction force", "Gravitational force"], correct: 1, explanation: "Torque is the rotational equivalent of force — it causes angular acceleration and is calculated as τ = r × F.", difficulty: "medium", topic: "Mechanical Engineering", subject: "Engineering", keywords: ["torque", "rotation", "force", "mechanical"] },
    { question: "What material property describes resistance to deformation?", options: ["Ductility", "Hardness", "Elasticity", "Stiffness"], correct: 3, explanation: "Stiffness describes a material's resistance to deformation under load, measured by its elastic modulus.", difficulty: "medium", topic: "Materials Engineering", subject: "Engineering", keywords: ["stiffness", "deformation", "materials", "engineering"] },
    { question: "What is a transistor?", options: ["A type of resistor", "A semiconductor device that amplifies or switches signals", "A type of capacitor", "A power supply"], correct: 1, explanation: "A transistor is a semiconductor device used to amplify or switch electronic signals, forming the basis of modern electronics.", difficulty: "medium", topic: "Electronics", subject: "Engineering", keywords: ["transistor", "semiconductor", "electronics", "amplify"] },

    // ─── Medicine ─────────────────────────────────────────────────────────
    { question: "What is the largest bone in the human body?", options: ["Humerus", "Tibia", "Femur", "Fibula"], correct: 2, explanation: "The femur (thigh bone) is the largest and strongest bone in the human body.", difficulty: "easy", topic: "Anatomy", subject: "Medicine", keywords: ["femur", "bone", "largest", "anatomy", "medicine"] },
    { question: "What organ produces insulin?", options: ["Liver", "Kidney", "Pancreas", "Stomach"], correct: 2, explanation: "The pancreas produces insulin through its beta cells in the Islets of Langerhans.", difficulty: "easy", topic: "Physiology", subject: "Medicine", keywords: ["insulin", "pancreas", "diabetes", "medicine"] },
    { question: "What are the four blood types?", options: ["A, B, C, D", "A, B, AB, O", "A, B, O, X", "I, II, III, IV"], correct: 1, explanation: "The four main blood types are A, B, AB, and O, classified by the ABO system based on antigens on red blood cells.", difficulty: "easy", topic: "Hematology", subject: "Medicine", keywords: ["blood type", "abo", "hematology", "medicine"] },
    { question: "What is an antibiotic?", options: ["A virus killer", "A medicine that kills bacteria", "A vitamin supplement", "A pain reliever"], correct: 1, explanation: "An antibiotic is a medication designed to fight bacterial infections by killing bacteria or preventing their growth.", difficulty: "easy", topic: "Pharmacology", subject: "Medicine", keywords: ["antibiotic", "bacteria", "medicine", "infection"] },
    { question: "What is the function of red blood cells?", options: ["Fight infections", "Carry oxygen", "Clot blood", "Produce antibodies"], correct: 1, explanation: "Red blood cells (erythrocytes) carry oxygen from the lungs to the body's tissues using hemoglobin.", difficulty: "easy", topic: "Physiology", subject: "Medicine", keywords: ["red blood cells", "oxygen", "hemoglobin", "physiology"] },

    // ─── Law ──────────────────────────────────────────────────────────────
    { question: "What is the presumption of innocence?", options: ["Everyone is guilty until proven", "Everyone is innocent until proven guilty", "Only judges can determine guilt", "Innocence cannot be proven"], correct: 1, explanation: "The presumption of innocence is a legal principle that states a person is considered innocent until proven guilty beyond a reasonable doubt.", difficulty: "easy", topic: "Legal Principles", subject: "Law", keywords: ["innocence", "guilty", "law", "legal", "principle"] },
    { question: "What is the difference between civil and criminal law?", options: ["No difference", "Civil involves disputes, criminal involves offenses against the state", "Criminal is less serious", "Civil requires a jury"], correct: 1, explanation: "Civil law handles disputes between individuals/organizations, while criminal law deals with offenses against the state/society.", difficulty: "medium", topic: "Law", subject: "Law", keywords: ["civil law", "criminal law", "legal", "disputes"] },
    { question: "What is habeas corpus?", options: ["A type of contract", "The right to be brought before a judge", "A legal document for property", "A court ruling"], correct: 1, explanation: "Habeas corpus is a fundamental legal right requiring a person under arrest to be brought before a judge, preventing unlawful detention.", difficulty: "medium", topic: "Constitutional Law", subject: "Law", keywords: ["habeas corpus", "detention", "rights", "constitutional law"] },
    { question: "What is a tort?", options: ["A type of crime", "A civil wrong causing harm", "A legal contract", "A court procedure"], correct: 1, explanation: "A tort is a civil wrong that causes harm or loss, giving the injured party the right to seek compensation through the legal system.", difficulty: "medium", topic: "Tort Law", subject: "Law", keywords: ["tort", "civil wrong", "harm", "compensation", "law"] },

    // ─── Philosophy ──────────────────────────────────────────────────────
    { question: "Who said 'I think, therefore I am'?", options: ["Plato", "Aristotle", "René Descartes", "Immanuel Kant"], correct: 2, explanation: "René Descartes famously stated 'Cogito, ergo sum' (I think, therefore I am) as the foundation of his philosophy.", difficulty: "easy", topic: "Philosophy", subject: "Philosophy", keywords: ["descartes", "cogito", "thinking", "philosophy"] },
    { question: "What is utilitarianism?", options: ["Focus on individual rights", "The greatest good for the greatest number", "Following divine commands", "Acting from duty alone"], correct: 1, explanation: "Utilitarianism, developed by Bentham and Mill, holds that the best action is the one that produces the greatest happiness for the greatest number.", difficulty: "medium", topic: "Ethics", subject: "Philosophy", keywords: ["utilitarianism", "happiness", "ethics", "philosophy", "bentham", "mill"] },
    { question: "What is Socratic method?", options: ["Teaching through lectures", "Learning through questioning and dialogue", "Memorization technique", "Scientific method"], correct: 1, explanation: "The Socratic method is a form of learning through cooperative dialogue and questioning to stimulate critical thinking.", difficulty: "medium", topic: "Philosophy", subject: "Philosophy", keywords: ["socratic", "questioning", "dialogue", "philosophy", "critical thinking"] },
    { question: "What is existentialism?", options: ["Reality is an illusion", "Existence precedes essence", "Only matter exists", "Knowledge comes from experience"], correct: 1, explanation: "Existentialism holds that individual existence precedes essence — humans define their own meaning in an inherently meaningless universe.", difficulty: "hard", topic: "Philosophy", subject: "Philosophy", keywords: ["existentialism", "existence", "essence", "philosophy", "sartre"] },

    // ─── Art & Design ────────────────────────────────────────────────────
    { question: "What are the three primary colors?", options: ["Red, Blue, Yellow", "Red, Green, Blue", "Red, Orange, Yellow", "Blue, Green, Purple"], correct: 0, explanation: "In traditional color theory, the three primary colors are Red, Blue, and Yellow (for paint/pigments). RGB is used for light.", difficulty: "easy", topic: "Color Theory", subject: "Art & Design", keywords: ["primary colors", "color theory", "art", "design"] },
    { question: "What is the golden ratio?", options: ["1.414", "1.618", "2.718", "3.142"], correct: 1, explanation: "The golden ratio (φ) is approximately 1.618, found throughout nature and used in art and design for aesthetically pleasing proportions.", difficulty: "medium", topic: "Design Principles", subject: "Art & Design", keywords: ["golden ratio", "phi", "proportion", "design", "aesthetics"] },
    { question: "Who painted the Mona Lisa?", options: ["Michelangelo", "Leonardo da Vinci", "Raphael", "Donatello"], correct: 1, explanation: "Leonardo da Vinci painted the Mona Lisa between 1503-1519. It hangs in the Louvre Museum in Paris.", difficulty: "easy", topic: "Art History", subject: "Art & Design", keywords: ["mona lisa", "da vinci", "painting", "art history"] },
    { question: "What art movement did Pablo Picasso co-found?", options: ["Impressionism", "Surrealism", "Cubism", "Abstract Expressionism"], correct: 2, explanation: "Pablo Picasso co-founded Cubism with Georges Braque, revolutionizing visual arts in the early 20th century.", difficulty: "medium", topic: "Art History", subject: "Art & Design", keywords: ["picasso", "cubism", "art movement", "modern art"] },
];

/**
 * Generate quiz questions from the local question bank
 */
export function generateLocalQuiz(
    topic: string,
    subject: string,
    difficulty: Difficulty,
    count: number
): { questions: QuizQuestion[] } {
    // Normalize search terms
    const topicLower = topic.toLowerCase().trim();
    const subjectLower = subject.toLowerCase().trim();

    // Score each question by relevance
    const scored = questionBank.map(q => {
        let score = 0;

        // Check difficulty match (strong preference)
        if (q.difficulty === difficulty) score += 10;

        // Check subject match
        if (subjectLower && q.subject.toLowerCase() === subjectLower) score += 8;

        // Check topic match against question topic
        if (topicLower && q.topic.toLowerCase().includes(topicLower)) score += 15;

        // Check topic match against keywords
        if (topicLower) {
            const topicWords = topicLower.split(/\s+/);
            for (const word of topicWords) {
                if (word.length < 2) continue;
                if (q.keywords.some(k => k.includes(word))) score += 5;
                if (q.question.toLowerCase().includes(word)) score += 3;
                if (q.topic.toLowerCase().includes(word)) score += 4;
                if (q.subject.toLowerCase().includes(word)) score += 2;
            }
        }

        // Add small random factor for variety
        score += Math.random() * 2;

        return { ...q, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Select top N questions, ensuring variety
    const selected: typeof scored = [];
    const usedQuestions = new Set<string>();

    for (const q of scored) {
        if (selected.length >= count) break;
        if (usedQuestions.has(q.question)) continue;
        usedQuestions.add(q.question);
        selected.push(q);
    }

    // If we don't have enough, fill with remaining random questions
    if (selected.length < count) {
        const remaining = scored.filter(q => !usedQuestions.has(q.question));
        // Shuffle remaining
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        for (const q of remaining) {
            if (selected.length >= count) break;
            selected.push(q);
        }
    }

    // Shuffle the final selection
    for (let i = selected.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [selected[i], selected[j]] = [selected[j], selected[i]];
    }

    return {
        questions: selected.map((q, i) => ({
            id: i + 1,
            question: q.question,
            options: q.options,
            correct: q.correct,
            explanation: q.explanation,
            difficulty: q.difficulty,
            topic: q.topic,
        })),
    };
}

/**
 * Generate quiz from syllabus text using keyword extraction
 */
export function generateSyllabusQuiz(
    syllabusText: string,
    difficulty: Difficulty,
    count: number
): { questions: QuizQuestion[]; detectedTopics: string[]; syllabySummary: string } {
    const textLower = syllabusText.toLowerCase();

    // Extract keywords from syllabus text
    const subjectScores: Record<string, number> = {};
    const topicScores: Record<string, number> = {};

    for (const q of questionBank) {
        let relevance = 0;
        for (const kw of q.keywords) {
            if (textLower.includes(kw)) relevance += 3;
        }
        if (textLower.includes(q.topic.toLowerCase())) relevance += 5;
        if (textLower.includes(q.subject.toLowerCase())) relevance += 2;

        if (relevance > 0) {
            subjectScores[q.subject] = (subjectScores[q.subject] || 0) + relevance;
            topicScores[q.topic] = (topicScores[q.topic] || 0) + relevance;
        }
    }

    // Get detected topics sorted by relevance
    const detectedTopics = Object.entries(topicScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([topic]) => topic);

    // Get the most relevant subject
    const bestSubject = Object.entries(subjectScores)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "";

    // Generate summary
    const syllabySummary = detectedTopics.length > 0
        ? `Your syllabus covers topics in ${bestSubject || "multiple subjects"}, including ${detectedTopics.slice(0, 3).join(", ")}${detectedTopics.length > 3 ? ` and ${detectedTopics.length - 3} more topics` : ""}.`
        : "Your syllabus has been analyzed. Questions have been generated from the available question bank.";

    // Use detected topics to generate quiz
    const topicString = detectedTopics.join(" ");
    const result = generateLocalQuiz(topicString, bestSubject, difficulty, count);

    return {
        questions: result.questions,
        detectedTopics,
        syllabySummary,
    };
}

/**
 * Important study question from the question bank
 */
export interface ImportantStudyQuestion {
    id: number;
    question: string;
    answer: string;
    topic: string;
    subject: string;
    difficulty: Difficulty;
    importance: "high" | "medium" | "low";
}

/**
 * Generate important study questions from uploaded document text.
 * Returns questions with answers organized by relevance to the document content.
 */
export function generateImportantQuestions(
    documentText: string,
    maxQuestions: number = 25
): { questions: ImportantStudyQuestion[]; detectedTopics: string[]; summary: string } {
    const textLower = documentText.toLowerCase();

    // Score each question by relevance to the document
    const scored = questionBank.map(q => {
        let relevance = 0;

        // Keyword matching
        for (const kw of q.keywords) {
            if (textLower.includes(kw)) relevance += 4;
        }

        // Topic matching
        if (textLower.includes(q.topic.toLowerCase())) relevance += 6;

        // Subject matching
        if (textLower.includes(q.subject.toLowerCase())) relevance += 3;

        // Question text word matching
        const questionWords = q.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const word of questionWords) {
            if (textLower.includes(word)) relevance += 1;
        }

        return { ...q, relevance };
    });

    // Filter only relevant questions (relevance > 0)
    const relevant = scored.filter(q => q.relevance > 0);

    // Sort by relevance descending
    relevant.sort((a, b) => b.relevance - a.relevance);

    // Detect topics
    const topicScores: Record<string, number> = {};
    const subjectScores: Record<string, number> = {};
    for (const q of relevant) {
        topicScores[q.topic] = (topicScores[q.topic] || 0) + q.relevance;
        subjectScores[q.subject] = (subjectScores[q.subject] || 0) + q.relevance;
    }

    const detectedTopics = Object.entries(topicScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([topic]) => topic);

    const bestSubject = Object.entries(subjectScores)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || "General";

    // Select top N questions, ensuring variety across topics
    const selected: typeof relevant = [];
    const usedQuestions = new Set<string>();
    const topicCounts: Record<string, number> = {};

    // First pass: get top questions with topic variety
    for (const q of relevant) {
        if (selected.length >= maxQuestions) break;
        if (usedQuestions.has(q.question)) continue;

        // Limit 4 questions per topic for variety
        const tc = topicCounts[q.topic] || 0;
        if (tc >= 4) continue;

        usedQuestions.add(q.question);
        topicCounts[q.topic] = tc + 1;
        selected.push(q);
    }

    // If not enough, fill without topic limit
    if (selected.length < maxQuestions) {
        for (const q of relevant) {
            if (selected.length >= maxQuestions) break;
            if (usedQuestions.has(q.question)) continue;
            usedQuestions.add(q.question);
            selected.push(q);
        }
    }

    // Assign importance based on relevance score
    const maxRelevance = selected[0]?.relevance || 1;
    const questions: ImportantStudyQuestion[] = selected.map((q, i) => {
        const ratio = q.relevance / maxRelevance;
        const importance: "high" | "medium" | "low" = ratio >= 0.7 ? "high" : ratio >= 0.4 ? "medium" : "low";

        return {
            id: i + 1,
            question: q.question,
            answer: `${q.options[q.correct]}. ${q.explanation}`,
            topic: q.topic,
            subject: q.subject,
            difficulty: q.difficulty,
            importance,
        };
    });

    const summary = detectedTopics.length > 0
        ? `Based on your document, we identified ${questions.length} important questions across ${bestSubject}, covering ${detectedTopics.slice(0, 4).join(", ")}${detectedTopics.length > 4 ? ` and ${detectedTopics.length - 4} more topics` : ""}.`
        : `We generated ${questions.length} important study questions from the available question bank.`;

    return { questions, detectedTopics, summary };
}
