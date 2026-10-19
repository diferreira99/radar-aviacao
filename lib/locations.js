import { norm } from "./util.js";

// Regiões oferecidas no site. Cada fonte usa o campo que entende:
// LinkedIn e Indeed recebem o texto de busca; Gupy e Vagas.com.br são filtrados pela cidade/UF da vaga.
export const LOCATIONS = {
  sp: { label: "São Paulo", linkedin: "São Paulo, São Paulo, Brasil", indeed: "São Paulo, SP", city: "São Paulo", uf: "SP" },
  gru: { label: "Guarulhos", linkedin: "Guarulhos, São Paulo, Brasil", indeed: "Guarulhos, SP", city: "Guarulhos", uf: "SP" },
  cps: { label: "Campinas", linkedin: "Campinas, São Paulo, Brasil", indeed: "Campinas, SP", city: "Campinas", uf: "SP" },
  sjc: { label: "São José dos Campos", linkedin: "São José dos Campos, São Paulo, Brasil", indeed: "São José dos Campos, SP", city: "São José dos Campos", uf: "SP" },
  estado: { label: "Estado de SP", linkedin: "São Paulo, Brasil", indeed: "Estado de São Paulo", uf: "SP" },
  br: { label: "Brasil", linkedin: "Brasil", indeed: "" },
};

const UF_NAMES = { SP: "sao paulo" };

// Confere se a cidade/UF de uma vaga cabe na região escolhida.
export function matchesLocation(loc, { city = "", state = "" }) {
  if (!loc.uf) return true;
  const st = norm(state);
  const stateOk = st === loc.uf.toLowerCase() || st === UF_NAMES[loc.uf];
  if (!loc.city) return stateOk;
  return norm(city) === norm(loc.city) && (stateOk || !st);
}
