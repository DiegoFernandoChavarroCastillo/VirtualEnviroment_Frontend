const PROGRAM_TRANSLATIONS: Record<string, string> = {
  SYSTEMS_ENGINEERING: 'Ingeniería de Sistemas',
  ELECTRICAL_ENGINEERING: 'Ingeniería Eléctrica',
  CIVIL_ENGINEERING: 'Ingeniería Civil',
  MECHANICAL_ENGINEERING: 'Ingeniería Mecánica',
  INDUSTRIAL_ENGINEERING: 'Ingeniería Industrial',
  ELECTRONIC_ENGINEERING: 'Ingeniería Electrónica',
  BIOMEDICAL_ENGINEERING: 'Ingeniería Biomédica',
  COMPUTER_SCIENCE: 'Ciencias de la Computación',
  MATHEMATICS: 'Matemáticas',
  PHYSICS: 'Física',
  CHEMISTRY: 'Química',
  BIOLOGY: 'Biología',
  MEDICINE: 'Medicina',
  LAW: 'Derecho',
  ECONOMICS: 'Economía',
  BUSINESS_ADMINISTRATION: 'Administración de Empresas',
  PSYCHOLOGY: 'Psicología',
  SOCIOLOGY: 'Sociología',
  ARCHITECTURE: 'Arquitectura',
  DESIGN: 'Diseño',
  COMMUNICATION: 'Comunicación Social',
  EDUCATION: 'Educación',
  PHILOSOPHY: 'Filosofía',
  HISTORY: 'Historia',
  LITERATURE: 'Literatura',
  ARTS: 'Artes',
  NURSING: 'Enfermería',
  PHARMACY: 'Farmacia',
  DENTISTRY: 'Odontología',
  VETERINARY: 'Veterinaria',
};

export const translateProgram = (program: string): string =>
  PROGRAM_TRANSLATIONS[program] ??
  program
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
