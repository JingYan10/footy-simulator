// Portugal, Netherlands, Saudi Arabia and the USA: top flight plus the two tiers below, based on 2025-26.
// Row: [club, manager, managerNation, "Name,POS,birthYear,NAT,OVR;..." (notable players), squadLevel, short]
// Same as lower-leagues.js; the optional last field sets the 3-4 letter club code.
// MLS is split into its two conferences. US soccer has no promotion or relegation (closed: true).

DB.leagues.push(
  // ---------- Portugal ----------
  {
    id: 'POR', name: 'Liga Portugal', country: 'Portugal', nat: 'POR', tier: 1,
    clubs: [
      ['Benfica', 'José Mourinho', 'POR', 'Anatoliy Trubin,GK,2001,UKR,83;Nicolás Otamendi,CB,1988,ARG,80;António Silva,CB,2003,POR,81;Tomás Araújo,CB,2002,POR,79;Amar Dedić,RB,2002,BIH,78;Samuel Dahl,LB,2003,SWE,77;Fredrik Aursnes,CM,1995,NOR,81;Enzo Barrenechea,CDM,2001,ARG,79;Richard Ríos,CM,2000,COL,80;Georgiy Sudakov,CAM,2002,UKR,80;Leandro Barreiro,CM,2000,LUX,77;Dodi Lukébakio,RW,1997,BEL,79;Andreas Schjelderup,LW,2004,DEN,77;Vangelis Pavlidis,ST,1998,GRE,81;Franjo Ivanović,ST,2003,CRO,76', 75, 'SLB'],
      ['Porto', 'Francesco Farioli', 'ITA', 'Diogo Costa,GK,1999,POR,84;Jan Bednarek,CB,1996,POL,78;Jakub Kiwior,CB,2000,POL,78;Alberto Costa,RB,2003,POR,76;Francisco Moura,LB,1999,POR,77;Alan Varela,CDM,2001,ARG,80;Victor Froholdt,CM,2006,DEN,77;Gabri Veiga,CM,2002,ESP,79;Rodrigo Mora,CAM,2007,POR,78;Pepê,RW,1997,BRA,78;William Gomes,RW,2006,BRA,76;Borja Sainz,LW,2001,ESP,77;Samu Aghehowa,ST,2004,ESP,80;Luuk de Jong,ST,1990,NED,75', 75, 'FCP'],
      ['Sporting CP', 'Rui Borges', 'POR', 'Rui Silva,GK,1994,POR,80;Gonçalo Inácio,CB,2001,POR,82;Ousmane Diomande,CB,2003,CIV,81;Zeno Debast,CB,2003,BEL,78;Ivan Fresneda,RB,2004,ESP,76;Maximiliano Araújo,LB,2000,URU,79;Morten Hjulmand,CDM,1999,DEN,82;Hidemasa Morita,CM,1995,JPN,79;Pedro Gonçalves,CAM,1998,POR,82;Francisco Trincão,RW,1999,POR,82;Geovany Quenda,RW,2007,POR,77;Geny Catamo,RM,2001,MOZ,76;Luis Suárez,ST,1997,COL,80;Fotis Ioannidis,ST,2000,GRE,78', 75, 'SCP'],
      ['Braga', 'Carlos Vicens', 'ESP', 'Lukáš Horníček,GK,2002,CZE,76;Sikou Niakaté,CB,1999,MLI,76;Bright Arrey-Mbi,CB,2003,ENG,74;Victor Gómez,RB,2000,ESP,75;João Moutinho,CM,1986,POR,74;Rodrigo Zalazar,CAM,1999,URU,78;Ricardo Horta,LW,1994,POR,79;Gabri Martínez,RW,2003,ESP,76;Fran Navarro,ST,1998,ESP,75', 70, 'SCB'],
      ['Vitória SC', 'Luís Pinto', 'POR', 'Charles,GK,1994,BRA,74;Tomás Händel,CM,2000,POR,74;Gustavo Silva,LW,1997,BRA,74;Nélson Oliveira,ST,1991,POR,72', 67, 'VSC'],
      ['Famalicão', 'Hugo Oliveira', 'POR', 'Lazar Carević,GK,1999,MNE,73;Gustavo Sá,CM,2004,POR,75;Sorriso,RW,2001,BRA,73', 66, 'FAM'],
      ['Gil Vicente', 'César Peixoto', 'POR', '', 65, 'GIL'],
      ['Moreirense', 'Vasco Botelho da Costa', 'POR', '', 65, 'MOR'],
      ['Estoril', 'Ian Cathro', 'SCO', '', 65, 'EST'],
      ['Santa Clara', 'Vasco Matos', 'POR', '', 65, 'SCL'],
      ['Rio Ave', 'Sotiris Silaidopoulos', 'GRE', '', 64, 'RAV'],
      ['Casa Pia', '', '', '', 64, 'CPA'],
      ['Arouca', 'Vasco Seabra', 'POR', '', 64, 'ARO'],
      ['Nacional', 'Tiago Margarido', 'POR', '', 63, 'NAC'],
      ['Estrela da Amadora', '', '', '', 63, 'EAM'],
      ['Alverca', 'Custódio', 'POR', '', 63, 'ALV'],
      ['Tondela', '', '', '', 62, 'TON'],
      ['AVS', '', '', '', 62, 'AVS'],
    ],
  },
  {
    id: 'POR2', name: 'Liga Portugal 2', country: 'Portugal', nat: 'POR', tier: 2,
    clubs: [
      ['Marítimo', '', '', '', 62], ['Vizela', '', '', '', 61], ['Académico de Viseu', '', '', '', 61], ['Chaves', '', '', '', 61],
      ['Torreense', '', '', '', 60], ['Leixões', '', '', '', 60], ['Feirense', '', '', '', 60], ['Penafiel', '', '', '', 59],
      ['Paços de Ferreira', '', '', '', 60], ['Benfica B', '', '', '', 60], ['Porto B', '', '', '', 60], ['Sporting CP B', '', '', '', 59],
      ['União de Leiria', '', '', '', 60], ['Oliveirense', '', '', '', 58], ['Portimonense', '', '', '', 60], ['Felgueiras', '', '', '', 58],
      ['Lusitânia Lourosa', '', '', '', 57], ['Farense', '', '', '', 60],
    ],
  },
  {
    id: 'POR3', name: 'Liga 3', country: 'Portugal', nat: 'POR', tier: 3,
    clubs: [
      ['Académica', '', '', '', 56], ['Belenenses', '', '', '', 56], ['Varzim', '', '', '', 55], ['Braga B', '', '', '', 55],
      ['Vitória SC B', '', '', '', 54], ['Trofense', '', '', '', 54], ['Amora', '', '', '', 54], ['Caldas', '', '', '', 53],
      ['Sanjoanense', '', '', '', 53], ['Atlético CP', '', '', '', 53], ['Fafe', '', '', '', 53], ['Mafra', '', '', '', 54],
      ['Lusitano de Évora', '', '', '', 52], ['São João de Ver', '', '', '', 52], ['Sporting da Covilhã', '', '', '', 53], ['Anadia', '', '', '', 52],
      ['Boavista', '', '', '', 55], ['Länk Vilaverdense', '', '', '', 52], ['Cova da Piedade', '', '', '', 52], ['Moncarapachense', '', '', '', 51],
    ],
  },

  // ---------- Netherlands ----------
  {
    id: 'NED', name: 'Eredivisie', country: 'Netherlands', nat: 'NED', tier: 1,
    clubs: [
      ['PSV', 'Peter Bosz', 'NED', 'Matej Kovář,GK,2000,CZE,78;Armando Obispo,CB,1999,NED,76;Yarek Gasiorowski,CB,2005,ESP,76;Sergiño Dest,RB,2000,USA,77;Mauro Júnior,LB,1999,BRA,77;Jerdy Schouten,CDM,1997,NED,80;Joey Veerman,CM,1998,NED,79;Ismael Saibari,CAM,2001,MAR,80;Guus Til,CAM,1997,NED,77;Ivan Perišić,LW,1989,CRO,77;Dennis Man,RW,1998,ROU,77;Couhaib Driouech,RW,2002,NED,75;Ricardo Pepi,ST,2003,USA,77', 72, 'PSV'],
      ['Feyenoord', 'Robin van Persie', 'NED', 'Timon Wellenreuther,GK,1995,GER,76;Gernot Trauner,CB,1992,AUT,77;Tsuyoshi Watanabe,CB,1997,JPN,75;Givairo Read,RB,2006,NED,75;Jordan Bos,LB,2002,AUS,75;Hwang In-beom,CM,1996,KOR,78;Quinten Timber,CM,2001,NED,78;Sem Steijn,CAM,2001,NED,77;Anis Hadj Moussa,RW,2002,ALG,78;Leo Sauer,LW,2005,SVK,74;Ayase Ueda,ST,1998,JPN,77', 71, 'FEY'],
      ['Ajax', 'Fred Grim', 'NED', 'Vítězslav Jaroš,GK,2001,CZE,76;Josip Šutalo,CB,2000,CRO,77;Youri Baas,CB,2003,NED,76;Anton Gaaei,RB,2002,DEN,74;Lucas Rosa,LB,2000,BRA,73;Kenneth Taylor,CM,2002,NED,78;Davy Klaassen,CM,1993,NED,74;Youri Regeer,CM,2003,NED,74;Oscar Gloukh,CAM,2004,ISR,77;Mika Godts,LW,2005,BEL,77;Steven Berghuis,RW,1991,NED,75;Wout Weghorst,ST,1992,NED,75', 71, 'AJA'],
      ['AZ', 'Maarten Martens', 'BEL', 'Rome Owusu-Oduro,GK,2004,NED,73;Wouter Goes,CB,2004,NED,73;Seiya Maikuma,RB,1997,JPN,73;Peer Koopmeiners,CDM,2000,NED,74;Jordy Clasie,CM,1991,NED,73;Kees Smit,CM,2006,NED,74;Sven Mijnans,CAM,1999,NED,76;Ro-Zangelo Daal,LW,2004,NED,72;Troy Parrott,ST,2002,IRL,76', 69, 'AZ'],
      ['FC Twente', 'Joseph Oosting', 'NED', 'Lars Unnerstall,GK,1990,GER,73;Mees Hilgers,CB,2001,NED,74;Michel Vlap,CAM,1997,NED,73;Ricky van Wolfswinkel,ST,1989,NED,71', 68, 'TWE'],
      ['FC Utrecht', 'Ron Jans', 'NED', 'Vasilios Barkas,GK,1994,GRE,72;Victor Jensen,CAM,2000,DEN,74;Miguel Rodríguez,RW,2003,ESP,72;David Min,ST,2003,NED,71', 67, 'UTR'],
      ['NEC', 'Dick Schreuder', 'NED', '', 66, 'NEC'],
      ['Go Ahead Eagles', 'Melvin Boel', 'NED', '', 65, 'GAE'],
      ['Heerenveen', 'Robin Veldman', 'NED', '', 65, 'HEE'],
      ['Sparta Rotterdam', 'Maurice Steijn', 'NED', '', 64, 'SPA'],
      ['Fortuna Sittard', 'Danny Buijs', 'NED', '', 64, 'FOR'],
      ['PEC Zwolle', 'Henry van der Vegt', 'NED', '', 63, 'PEC'],
      ['Groningen', 'Dick Lukkien', 'NED', '', 64, 'GRO'],
      ['Heracles', 'John Lammers', 'NED', '', 63, 'HER'],
      ['NAC Breda', 'Carl Hoefkens', 'BEL', '', 63, 'NAC'],
      ['Excelsior', 'Ruben den Uil', 'NED', '', 62, 'EXC'],
      ['FC Volendam', 'Rick Kruys', 'NED', '', 62, 'VOL'],
      ['Telstar', 'Anthony Correia', 'NED', '', 61, 'TEL'],
    ],
  },
  {
    id: 'NED2', name: 'Eerste Divisie', country: 'Netherlands', nat: 'NED', tier: 2,
    clubs: [
      ['Willem II', '', '', '', 61], ['Almere City', '', '', '', 61], ['RKC Waalwijk', '', '', '', 60], ['Cambuur', '', '', '', 60],
      ['De Graafschap', '', '', '', 59], ['ADO Den Haag', '', '', '', 60], ['Roda JC', '', '', '', 59], ['FC Dordrecht', '', '', '', 58],
      ['FC Den Bosch', '', '', '', 58], ['Helmond Sport', '', '', '', 57], ['FC Emmen', '', '', '', 58], ['MVV Maastricht', '', '', '', 57],
      ['VVV-Venlo', '', '', '', 58], ['TOP Oss', '', '', '', 56], ['FC Eindhoven', '', '', '', 57], ['Vitesse', '', '', '', 58],
      ['Jong Ajax', '', '', '', 58], ['Jong PSV', '', '', '', 58], ['Jong AZ', '', '', '', 57], ['Jong FC Utrecht', '', '', '', 56],
    ],
  },
  {
    id: 'NED3', name: 'Tweede Divisie', country: 'Netherlands', nat: 'NED', tier: 3,
    clubs: [
      ['Katwijk', '', '', '', 53], ['Rijnsburgse Boys', '', '', '', 53], ['Spakenburg', '', '', '', 53], ['Quick Boys', '', '', '', 52],
      ['Kozakken Boys', '', '', '', 52], ['HHC Hardenberg', '', '', '', 52], ['De Treffers', '', '', '', 51], ['GVVV', '', '', '', 51],
      ['Excelsior Maassluis', '', '', '', 51], ['ACV', '', '', '', 50], ['Jong Almere City', '', '', '', 50], ['Hoek', '', '', '', 50],
      ['AFC', '', '', '', 51], ['Scheveningen', '', '', '', 50], ['Barendrecht', '', '', '', 50], ['IJsselmeervogels', '', '', '', 51],
      ['Noordwijk', '', '', '', 50], ['Jong Sparta', '', '', '', 50],
    ],
  },

  // ---------- Saudi Arabia ----------
  {
    id: 'KSA', name: 'Saudi Pro League', country: 'Saudi Arabia', nat: 'KSA', tier: 1,
    clubs: [
      ['Al Hilal', 'Simone Inzaghi', 'ITA', 'Yassine Bounou,GK,1991,MAR,83;Kalidou Koulibaly,CB,1991,SEN,80;Ali Lajami,CB,1996,KSA,72;João Cancelo,RB,1994,POR,82;Theo Hernández,LB,1997,FRA,83;Rúben Neves,CDM,1997,POR,82;Sergej Milinković-Savić,CM,1995,SRB,83;Mohamed Kanno,CM,1994,KSA,74;Malcom,RW,1997,BRA,82;Salem Al-Dawsari,LW,1991,KSA,78;Darwin Núñez,ST,1999,URU,81;Marcos Leonardo,ST,2003,BRA,76', 70, 'HIL'],
      ['Al Nassr', 'Jorge Jesus', 'POR', 'Bento,GK,1999,BRA,78;Iñigo Martínez,CB,1991,ESP,80;Mohamed Simakan,CB,2000,FRA,78;Nawaf Boushal,LB,1999,KSA,71;Marcelo Brozović,CDM,1992,CRO,80;Ângelo Gabriel,RW,2004,BRA,75;João Félix,CAM,1999,POR,80;Kingsley Coman,LW,1996,FRA,80;Sadio Mané,LW,1992,SEN,80;Cristiano Ronaldo,ST,1985,POR,84', 69, 'NAS'],
      ['Al Ittihad', 'Sérgio Conceição', 'POR', 'Predrag Rajković,GK,1995,SRB,78;Danilo Pereira,CB,1991,POR,77;Hassan Kadesh,CB,1992,KSA,70;Fabinho,CDM,1993,BRA,79;N\'Golo Kanté,CM,1991,FRA,80;Houssem Aouar,CAM,1998,ALG,78;Moussa Diaby,RW,1999,FRA,79;Steven Bergwijn,LW,1997,NED,77;Karim Benzema,ST,1987,FRA,82', 69, 'ITT'],
      ['Al Ahli', 'Matthias Jaissle', 'GER', 'Édouard Mendy,GK,1992,SEN,80;Merih Demiral,CB,1998,TUR,79;Roger Ibañez,CB,1998,BRA,78;Franck Kessié,CM,1996,CIV,79;Enzo Millot,CAM,2002,FRA,78;Riyad Mahrez,RW,1991,ALG,80;Galeno,LW,1997,BRA,79;Ivan Toney,ST,1996,ENG,81', 68, 'AHL'],
      ['Al Qadsiah', 'Brendan Rodgers', 'NIR', 'Koen Casteels,GK,1992,BEL,80;Nacho,CB,1990,ESP,77;Nahitan Nández,CM,1995,URU,77;Ezequiel Fernández,CDM,2002,ARG,76;Otávio,CAM,1995,POR,79;Julián Quiñones,ST,1997,MEX,78;Mateo Retegui,ST,1999,ITA,80', 67, 'QAD'],
      ['Al Ettifaq', 'Saad Al-Shehri', 'KSA', 'Jack Hendry,CB,1995,SCO,74;Georginio Wijnaldum,CM,1990,NED,76;Moussa Dembélé,ST,1996,FRA,76', 64, 'ETT'],
      ['Al Shabab', 'Imanol Alguacil', 'ESP', 'Yannick Carrasco,LW,1993,BEL,77;Abderrazak Hamdallah,ST,1990,MAR,75', 64, 'SHA'],
      ['Al Taawoun', 'Péricles Chamusca', 'BRA', '', 63, 'TAA'],
      ['Al Fateh', 'José Gomes', 'POR', '', 62, 'FAT'],
      ['Al Khaleej', 'Georgios Donis', 'GRE', '', 62, 'KHA'],
      ['Al Fayha', '', '', '', 61, 'FAY'],
      ['Al Riyadh', '', '', '', 60, 'RIY'],
      ['Al Kholood', '', '', '', 60, 'KHO'],
      ['Al Okhdood', '', '', '', 60, 'OKH'],
      ['Al Hazem', '', '', '', 59, 'HAZ'],
      ['Al Najma', '', '', '', 59, 'NAJ'],
      ['NEOM', '', '', '', 61, 'NEO'],
      ['Damac', '', '', '', 60, 'DAM'],
    ],
  },
  {
    id: 'KSA2', name: 'Saudi First Division League', country: 'Saudi Arabia', nat: 'KSA', tier: 2,
    clubs: [
      ['Abha', '', '', '', 57], ['Al Wehda', '', '', '', 57], ['Al Raed', '', '', '', 57], ['Al Orobah', '', '', '', 56],
      ['Al Jabalain', '', '', '', 55], ['Al Faisaly', '', '', '', 56], ['Al Adalah', '', '', '', 55], ['Al Batin', '', '', '', 54],
      ['Al Jandal', '', '', '', 54], ['Al Ula', '', '', '', 54], ['Al Bukiryah', '', '', '', 54], ['Al Zulfi', '', '', '', 53],
      ['Al Arabi', '', '', '', 54], ['Al Diriyah', '', '', '', 54], ['Jeddah', '', '', '', 53], ['Al Anwar', '', '', '', 53],
      ['Al Tai', '', '', '', 54], ['Ohod', '', '', '', 53],
    ],
  },
  {
    id: 'KSA3', name: 'Saudi Second Division League', country: 'Saudi Arabia', nat: 'KSA', tier: 3,
    clubs: [
      ['Al Sahel', '', '', '', 50], ['Al Qaisumah', '', '', '', 49], ['Hajer', '', '', '', 50], ['Al Nojoom', '', '', '', 49],
      ['Al Kawkab', '', '', '', 49], ['Al Hejaz', '', '', '', 48], ['Al Washm', '', '', '', 48], ['Al Safa', '', '', '', 48],
      ['Al Shoulla', '', '', '', 49], ['Najran', '', '', '', 49], ['Al Entesar', '', '', '', 47], ['Al Nahda', '', '', '', 48],
      ['Al Taraji', '', '', '', 48], ['Al Rawdhah', '', '', '', 47], ['Al Draih', '', '', '', 47], ['Wej', '', '', '', 47],
    ],
  },

  // ---------- United States ----------
  {
    id: 'USA', name: 'MLS Eastern Conference', country: 'United States', nat: 'USA', tier: 1, closed: true,
    clubs: [
      ['Inter Miami', 'Javier Mascherano', 'ARG', 'Rocco Ríos Novo,GK,2002,ARG,68;Maximiliano Falcón,CB,1997,URU,70;Jordi Alba,LB,1989,ESP,75;Rodrigo De Paul,CM,1994,ARG,79;Sergio Busquets,CDM,1988,ESP,75;Tadeo Allende,RW,1999,ARG,72;Lionel Messi,RW,1987,ARG,86;Luis Suárez,ST,1987,URU,77', 66, 'MIA'],
      ['FC Cincinnati', 'Pat Noonan', 'USA', 'Roman Celentano,GK,2000,USA,71;Miles Robinson,CB,1997,USA,72;Evander,CAM,1998,BRA,77;Kévin Denkey,ST,2000,TOG,74', 66, 'CIN'],
      ['Philadelphia Union', 'Bradley Carnell', 'RSA', 'Andre Blake,GK,1990,JAM,73;Jakob Glesnes,CB,1994,NOR,71;Danley Jean Jacques,CDM,2000,HAI,70;Tai Baribo,ST,1998,ISR,72', 65, 'PHI'],
      ['Charlotte FC', 'Dean Smith', 'ENG', 'Kristijan Kahlina,GK,1992,CRO,72;Pep Biel,CAM,1996,ESP,72;Liel Abada,RW,2001,ISR,73;Wilfried Zaha,LW,1992,CIV,74;Idan Toklomati,ST,2004,ISR,68', 64, 'CLT'],
      ['Orlando City', 'Óscar Pareja', 'COL', 'Pedro Gallese,GK,1990,PER,70;Martín Ojeda,CAM,1998,ARG,74;Marco Pašalić,RW,2000,CRO,71;Luis Muriel,ST,1991,COL,71', 64, 'ORL'],
      ['New York City FC', 'Pascal Jansen', 'NED', 'Matt Freese,GK,1998,USA,70;Maxi Moralez,CAM,1987,ARG,69;Alonso Martínez,ST,1998,CRC,71', 64, 'NYC'],
      ['New York Red Bulls', '', '', 'Emil Forsberg,CAM,1991,SWE,73;Eric Choupo-Moting,ST,1989,CMR,70', 63, 'NYRB'],
      ['Columbus Crew', '', '', 'Patrick Schulte,GK,2001,USA,71;Diego Rossi,LW,1998,URU,74;Wessam Abou Ali,ST,1999,PLE,71', 64, 'CLB'],
      ['Nashville SC', 'B.J. Callaghan', 'USA', 'Walker Zimmerman,CB,1993,USA,71;Hany Mukhtar,CAM,1995,GER,75;Sam Surridge,ST,1998,ENG,73', 64, 'NSH'],
      ['Chicago Fire', 'Gregg Berhalter', 'USA', 'Philip Zinckernagel,RW,1994,DEN,72;Hugo Cuypers,ST,1997,BEL,72', 63, 'CHI'],
      ['Atlanta United', '', '', 'Miguel Almirón,RW,1994,PAR,74;Emmanuel Latte Lath,ST,1998,CIV,72', 63, 'ATL'],
      ['Toronto FC', 'Robin Fraser', 'USA', 'Federico Bernardeschi,RW,1994,ITA,73', 61, 'TOR'],
      ['CF Montréal', 'Marco Donadel', 'ITA', '', 60, 'MTL'],
      ['D.C. United', 'René Weiler', 'SUI', 'Christian Benteke,ST,1990,BEL,72', 60, 'DC'],
      ['New England Revolution', 'Caleb Porter', 'USA', 'Matt Turner,GK,1994,USA,73;Carles Gil,CAM,1992,ESP,74', 61, 'NE'],
    ],
  },
  {
    id: 'USAW', name: 'MLS Western Conference', country: 'United States', nat: 'USA', tier: 1, closed: true,
    clubs: [
      ['LAFC', 'Steve Cherundolo', 'USA', 'Hugo Lloris,GK,1986,FRA,76;Aaron Long,CB,1992,USA,70;Timothy Tillman,CM,1999,USA,71;Son Heung-min,LW,1992,KOR,82;Denis Bouanga,LW,1994,GAB,77', 65, 'LAFC'],
      ['San Diego FC', 'Mikey Varas', 'USA', 'CJ dos Santos,GK,2000,USA,69;Jeppe Tverskov,CDM,1993,DEN,70;Anders Dreyer,RW,1998,DEN,75;Hirving Lozano,LW,1995,MEX,76', 64, 'SD'],
      ['Vancouver Whitecaps', 'Jesper Sørensen', 'DEN', 'Yohei Takaoka,GK,1996,JPN,71;Sebastian Berhalter,CM,2001,USA,71;Thomas Müller,CAM,1989,GER,78;Brian White,ST,1996,USA,71', 64, 'VAN'],
      ['Seattle Sounders', 'Brian Schmetzer', 'USA', 'Stefan Frei,GK,1986,SUI,70;Jackson Ragen,CB,1998,USA,70;Cristian Roldan,CM,1995,USA,72;Albert Rusnák,CAM,1994,SVK,73;Jordan Morris,ST,1994,USA,71', 64, 'SEA'],
      ['Minnesota United', 'Eric Ramsay', 'WAL', 'Dayne St. Clair,GK,1997,CAN,73;Anthony Markanich,LB,1999,USA,69;Kelvin Yeboah,ST,2000,ITA,71', 63, 'MIN'],
      ['LA Galaxy', 'Greg Vanney', 'USA', 'Riqui Puig,CM,1999,ESP,75;Marco Reus,CAM,1989,GER,74;Gabriel Pec,RW,2001,BRA,73', 62, 'LAG'],
      ['Portland Timbers', 'Phil Neville', 'ENG', 'David da Costa,CAM,2003,POR,72;Antony,RW,2002,BRA,70', 62, 'POR'],
      ['Austin FC', 'Nico Estévez', 'ESP', 'Brad Stuver,GK,1991,USA,70;Brandon Vázquez,ST,1998,USA,70', 61, 'ATX'],
      ['San Jose Earthquakes', 'Bruce Arena', 'USA', 'Cristian Espinoza,RW,1995,ARG,72;Josef Martínez,ST,1993,VEN,70', 61, 'SJ'],
      ['Real Salt Lake', 'Pablo Mastroeni', 'USA', 'Rafael Cabral,GK,1990,BRA,69;Diego Luna,CAM,2003,USA,72', 61, 'RSL'],
      ['Colorado Rapids', 'Chris Armas', 'USA', 'Zack Steffen,GK,1995,USA,70;Djordje Mihailovic,CAM,1998,USA,72', 61, 'COL'],
      ['Houston Dynamo', 'Ben Olsen', 'USA', 'Jack McGlynn,CM,2003,USA,70;Ezequiel Ponce,ST,1997,ARG,70', 60, 'HOU'],
      ['FC Dallas', 'Eric Quill', 'USA', 'Petar Musa,ST,1998,CRO,73', 60, 'DAL'],
      ['Sporting Kansas City', '', '', 'Dejan Joveljić,ST,1999,SRB,70', 59, 'SKC'],
      ['St. Louis City SC', '', '', 'Roman Bürki,GK,1990,SUI,71', 59, 'STL'],
    ],
  },
  {
    id: 'USA2', name: 'USL Championship', country: 'United States', nat: 'USA', tier: 2, closed: true,
    clubs: [
      ['Louisville City', '', '', '', 56], ['Charleston Battery', '', '', '', 55], ['Tampa Bay Rowdies', '', '', '', 55], ['Pittsburgh Riverhounds', '', '', '', 54],
      ['North Carolina FC', '', '', '', 53], ['Hartford Athletic', '', '', '', 53], ['Detroit City', '', '', '', 54], ['Indy Eleven', '', '', '', 54],
      ['Loudoun United', '', '', '', 53], ['Miami FC', '', '', '', 52], ['Birmingham Legion', '', '', '', 54], ['Rhode Island FC', '', '', '', 54],
      ['New Mexico United', '', '', '', 54], ['Sacramento Republic', '', '', '', 55], ['Orange County SC', '', '', '', 54], ['San Antonio FC', '', '', '', 54],
      ['Phoenix Rising', '', '', '', 54], ['Colorado Springs Switchbacks', '', '', '', 54], ['El Paso Locomotive', '', '', '', 53], ['Las Vegas Lights', '', '', '', 53],
      ['Oakland Roots', '', '', '', 53], ['Monterey Bay', '', '', '', 52], ['FC Tulsa', '', '', '', 53], ['Lexington SC', '', '', '', 52],
    ],
  },
  {
    id: 'USA3', name: 'USL League One', country: 'United States', nat: 'USA', tier: 3, closed: true,
    clubs: [
      ['Spokane Velocity', '', '', '', 49], ['One Knoxville', '', '', '', 50], ['Greenville Triumph', '', '', '', 49], ['Charlotte Independence', '', '', '', 49],
      ['Richmond Kickers', '', '', '', 48], ['Chattanooga Red Wolves', '', '', '', 48], ['Forward Madison', '', '', '', 49], ['Union Omaha', '', '', '', 50],
      ['Westchester SC', '', '', '', 48], ['AV Alta', '', '', '', 48], ['Portland Hearts of Pine', '', '', '', 48], ['Texoma FC', '', '', '', 47],
      ['Corpus Christi FC', '', '', '', 47], ['South Georgia Tormenta', '', '', '', 48],
    ],
  },
);

// Name pools for the new countries' generated players.
Object.assign(NAME_POOLS, {
  KSA: [['Mohammed', 'Abdullah', 'Fahad', 'Saud', 'Salem', 'Faisal', 'Turki', 'Nasser', 'Sultan', 'Hassan', 'Ali', 'Yasser', 'Khalid', 'Omar'], ['Al-Dawsari', 'Al-Shehri', 'Al-Faraj', 'Al-Ghannam', 'Al-Malki', 'Al-Buraikan', 'Al-Harbi', 'Al-Amri', 'Al-Qahtani', 'Al-Otaibi', 'Al-Ghamdi', 'Al-Zahrani']],
  USA: [['Tyler', 'Brandon', 'Josh', 'Christian', 'Weston', 'Gio', 'Jordan', 'Kellyn', 'Brenden', 'Cole', 'Caden', 'Diego', 'Malik', 'Owen'], ['Johnson', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Robinson', 'Reyna', 'Adams', 'Ramirez', 'Brooks']],
});
Object.assign(NATIONS, { KSA: 'Saudi Arabia' });

// ---------- Turkey ----------
// Süper Lig, 1. Lig and 2. Lig (2025-26, best effort). Same row format as above.
DB.leagues.push(
  {
    id: 'TUR', name: 'Süper Lig', country: 'Turkey', nat: 'TUR', tier: 1,
    clubs: [
      ['Galatasaray', 'Okan Buruk', 'TUR', 'Uğurcan Çakır,GK,1996,TUR,82;Davinson Sánchez,CB,1996,COL,80;Abdülkerim Bardakcı,CB,1994,TUR,78;Wilfried Singo,RB,2000,CIV,79;Eren Elmalı,LB,2000,TUR,76;Lucas Torreira,CDM,1996,URU,81;Gabriel Sara,CM,1999,BRA,80;İlkay Gündoğan,CM,1990,GER,82;Leroy Sané,LW,1996,GER,82;Barış Alper Yılmaz,RW,2000,TUR,80;Yunus Akgün,RW,2000,TUR,77;Roland Sallai,RW,1997,HUN,77;Victor Osimhen,ST,1998,NGA,86;Mauro Icardi,ST,1993,ARG,80', 76, 'GAL'],
      ['Fenerbahçe', 'Domenico Tedesco', 'ITA', 'Ederson,GK,1993,BRA,85;Milan Škriniar,CB,1995,SVK,81;Jayden Oosterwolde,CB,2001,NED,77;Nélson Semedo,RB,1993,POR,78;Archie Brown,LB,2002,ENG,76;Edson Álvarez,CDM,1997,MEX,80;İsmail Yüksek,CDM,1999,TUR,77;Fred,CM,1993,BRA,79;Marco Asensio,CAM,1996,ESP,81;Anderson Talisca,CAM,1994,BRA,79;Kerem Aktürkoğlu,LW,1998,TUR,80;Jhon Durán,ST,2003,COL,79;Youssef En-Nesyri,ST,1997,MAR,80', 75, 'FEN'],
      ['Beşiktaş', 'Sergen Yalçın', 'TUR', 'Ersin Destanoğlu,GK,2001,TUR,76;Tiago Djaló,CB,2000,POR,77;Emirhan Topçu,CB,2001,TUR,75;Gabriel Paulista,CB,1990,BRA,75;Jonas Svensson,RB,1993,NOR,74;Rıdvan Yılmaz,LB,2001,TUR,75;Wilfred Ndidi,CDM,1996,NGA,79;Orkun Kökçü,CM,2000,TUR,81;Salih Uçan,CM,1994,TUR,75;Milot Rashica,LW,1996,KOS,76;Cengiz Ünder,RW,1997,TUR,77;Tammy Abraham,ST,1997,ENG,78;El Bilal Touré,ST,2001,MLI,77', 72, 'BJK'],
      ['Trabzonspor', 'Fatih Tekke', 'TUR', 'André Onana,GK,1996,CMR,80;Stefan Savić,CB,1991,MNE,77;Arseniy Batagov,CB,2002,UKR,74;Wagner Pina,RB,2002,POR,74;Mustafa Eskihellaç,LB,1997,TUR,73;Tim Jabol-Folcarelli,CM,1999,FRA,74;Ernest Muçi,CAM,2001,ALB,76;Oleksandr Zubkov,RW,1996,UKR,76;Edin Višća,RW,1990,BIH,74;Paul Onuachu,ST,1994,NGA,79', 70, 'TRA'],
      ['Başakşehir', 'Nuri Şahin', 'TUR', 'Muhammed Şengezer,GK,1997,TUR,74;Léo Duarte,CB,1996,BRA,75;Jerome Opoku,CB,1998,GHA,73;Onur Bulut,RB,1994,TUR,72;Olivier Kemen,CM,1996,FRA,74;Miguel Crespo,CM,1996,POR,74;Yusuf Sarı,RW,1998,TUR,73;Eldor Shomurodov,ST,1995,UZB,76;Davie Selke,ST,1995,GER,75', 69, 'IBFK'],
      ['Göztepe', 'Stanimir Stoilov', 'BUL', 'Mateusz Lis,GK,1997,POL,75;Heliton,CB,1996,BRA,73;David Tijanić,CAM,1997,SVN,74;Romulo,ST,2001,BRA,75', 68, 'GÖZ'],
      ['Samsunspor', 'Thomas Reis', 'GER', 'Okan Kocuk,GK,1995,TUR,75;Rick van Drongelen,CB,1998,NED,74;Olivier Ntcham,CM,1996,CMR,74;Carlo Holse,RW,1999,DEN,75;Marius Mouandilmadji,ST,1998,CHA,74', 68, 'SAM'],
      ['Eyüpspor', '', '', '', 66, 'EYP'], ['Kasımpaşa', 'Emre Belözoğlu', 'TUR', '', 66, 'KAS'], ['Kocaelispor', 'Selçuk İnan', 'TUR', '', 65, 'KOC'],
      ['Antalyaspor', 'Erol Bulut', 'TUR', '', 65, 'ANT'], ['Alanyaspor', 'João Pereira', 'POR', '', 66, 'ALA'], ['Konyaspor', 'Recep Uçar', 'TUR', '', 66, 'KON'],
      ['Kayserispor', 'Markus Gisdol', 'GER', '', 64, 'KAY'], ['Gaziantep FK', 'Burak Yılmaz', 'TUR', '', 66, 'GFK'], ['Çaykur Rizespor', 'İlhan Palut', 'TUR', '', 66, 'RİZ'],
      ['Gençlerbirliği', '', '', '', 64, 'GEN'], ['Fatih Karagümrük', '', '', '', 64, 'FKG'],
    ],
  },
  {
    id: 'TUR2', name: '1. Lig', country: 'Turkey', nat: 'TUR', tier: 2,
    clubs: [
      ['Sivasspor', '', '', '', 61], ['Hatayspor', '', '', '', 60], ['Adana Demirspor', '', '', '', 59], ['Bodrum FK', '', '', '', 61],
      ['Bandırmaspor', '', '', '', 60], ['Erzurumspor FK', '', '', '', 61], ['Esenler Erokspor', '', '', '', 60], ['Amed SK', '', '', '', 60],
      ['Çorum FK', '', '', '', 60], ['Iğdır FK', '', '', '', 59], ['Keçiörengücü', '', '', '', 59], ['Manisa FK', '', '', '', 59],
      ['Pendikspor', '', '', '', 60], ['Sakaryaspor', '', '', '', 59], ['Serikspor', '', '', '', 58], ['Sarıyer', '', '', '', 58],
      ['Ümraniyespor', '', '', '', 59], ['Boluspor', '', '', '', 59], ['İstanbulspor', '', '', '', 59], ['Vanspor FK', '', '', '', 58],
    ],
  },
  {
    id: 'TUR3', name: '2. Lig', country: 'Turkey', nat: 'TUR', tier: 3,
    clubs: [
      ['MKE Ankaragücü', '', '', '', 56], ['Bursaspor', '', '', '', 56], ['Şanlıurfaspor', '', '', '', 55], ['Altınordu', '', '', '', 54],
      ['Tuzlaspor', '', '', '', 54], ['Kırklarelispor', '', '', '', 53], ['Bucaspor 1928', '', '', '', 53], ['Beyoğlu Yeni Çarşı', '', '', '', 53],
      ['Batman Petrolspor', '', '', '', 53], ['Muşspor', '', '', '', 52], ['Karaman FK', '', '', '', 52], ['Somaspor', '', '', '', 52],
      ['Ankara Demirspor', '', '', '', 52], ['Kepezspor', '', '', '', 52], ['Aliağa FK', '', '', '', 52], ['İnegölspor', '', '', '', 53],
      ['Arnavutköy Belediyespor', '', '', '', 52], ['68 Aksaray Belediyespor', '', '', '', 52], ['Mardin 1969 Spor', '', '', '', 51], ['Isparta 32 Spor', '', '', '', 51],
    ],
  },
);
Object.assign(NAME_POOLS, {
  TUR: [['Emre', 'Mert', 'Burak', 'Arda', 'Kerem', 'Can', 'Efe', 'Yusuf', 'Ozan', 'Kaan', 'Berk', 'Hakan', 'Cenk', 'Oğuz'], ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Aydın', 'Öztürk', 'Arslan', 'Doğan', 'Kılıç', 'Aslan', 'Koç', 'Kurt']],
});

// ---------- Belgium ----------
// Pro League, Challenger Pro League and Division 1 (2025-26, best effort). Same row format as above.
// Division 1 is split into a Flemish and a French-speaking section; the game plays one combined
// league of their senior clubs. U23 sides of the big clubs play in the second tier, as in reality.
DB.leagues.push(
  {
    id: 'BEL', name: 'Belgian Pro League', country: 'Belgium', nat: 'BEL', tier: 1,
    clubs: [
      ['Club Brugge', 'Ivan Leko', 'CRO', 'Simon Mignolet,GK,1988,BEL,77;Joel Ordóñez,CB,2004,ECU,77;Brandon Mechele,CB,1993,BEL,75;Kyriani Sabbe,RB,2005,BEL,72;Joaquin Seys,LB,2005,BEL,72;Raphael Onyedika,CDM,2001,NGA,77;Aleksandar Stanković,CM,2005,SRB,74;Hugo Vetlesen,CM,2000,NOR,75;Hans Vanaken,CAM,1992,BEL,78;Christos Tzolis,LW,2002,GRE,79;Carlos Forbs,RW,2004,POR,76;Nicolò Tresoldi,ST,2004,GER,73;Romeo Vermant,ST,2004,BEL,72', 72, 'CLU'],
      ['Union SG', 'David Hubert', 'BEL', 'Kjell Scherpen,GK,2000,NED,74;Christian Burgess,CB,1991,ENG,74;Kevin Mac Allister,CB,1997,ARG,74;Ross Sykes,CB,1999,ENG,72;Anan Khalaili,RB,2004,ISR,74;Kamiel Van de Perre,CM,2004,BEL,73;Anouar Ait El Hadj,CAM,2002,BEL,73;Promise David,ST,2001,CAN,74;Kevin Rodríguez,ST,2000,ECU,73', 70, 'USG'],
      ['Anderlecht', 'Jérémy Taravel', 'FRA', 'Colin Coosemans,GK,1992,BEL,74;Jan-Carlo Simić,CB,2005,SRB,74;Killian Sardella,RB,2002,BEL,72;Moussa N\'Diaye,LB,2002,SEN,72;Nathan De Cat,CM,2008,BEL,70;Yari Verschaeren,CAM,2001,BEL,74;Mario Stroeykens,CAM,2004,BEL,73;Thorgan Hazard,LW,1993,BEL,73;Tristan Degreef,RW,2005,BEL,70;Luis Vázquez,ST,2001,ARG,72', 69, 'AND'],
      ['Genk', 'Nicky Hayen', 'BEL', 'Hendrik Van Crombrugge,GK,1993,BEL,73;Matte Smets,CB,2004,BEL,72;Zakaria El Ouahdi,RB,2001,MAR,74;Bryan Heynen,CM,1997,BEL,74;Patrik Hrošovský,CM,1992,SVK,72;Jarne Steuckers,CAM,2002,BEL,72;Junya Ito,RW,1993,JPN,75;Oh Hyeon-gyu,ST,2001,KOR,72', 69, 'GNK'],
      ['Gent', 'Rik De Mil', 'BEL', 'Davy Roef,GK,1994,BEL,72;Tsuyoshi Watanabe,CB,1997,JPN,72;Omri Gandelman,CM,2000,ISR,73;Momodou Sonko,RW,2005,SWE,70;Max Dean,ST,2004,ENG,70', 67, 'GNT'],
      ['Antwerp', 'Faris Haroun', 'BEL', 'Dennis Praet,CM,1994,BEL,72;Gyrano Kerk,RW,1995,NED,72;Vincent Janssen,ST,1994,NED,73', 67, 'ANT'],
      ['Standard Liège', 'Vincent Euvrard', 'BEL', 'Matthieu Epolo,GK,2005,BEL,70;Ibe Hautekiet,CB,2002,BEL,70;Marlon Fossey,RB,1998,USA,71;Timothé Nkada,ST,1999,FRA,69', 66, 'STA'],
      ['Mechelen', 'Frederik Vanderbiest', 'BEL', '', 65, 'MEC'], ['Sint-Truiden', 'Wouter Vrancken', 'BEL', '', 65, 'STV'], ['Westerlo', 'Issame Charaï', 'BEL', '', 65, 'WES'],
      ['Charleroi', 'Mario Kohnen', 'BEL', '', 65, 'CHA'], ['OH Leuven', 'Felice Mazzù', 'BEL', '', 64, 'OHL'], ['Cercle Brugge', 'Lars Friis', 'DEN', '', 64, 'CER'],
      ['Dender EH', 'Yannick Ferrera', 'BEL', '', 63, 'DEN'], ['Zulte Waregem', 'Steve Colpaert', 'BEL', '', 63, 'ZWA'], ['La Louvière', 'Frédéric Taquin', 'BEL', '', 62, 'RAAL'],
    ],
  },
  {
    id: 'BEL2', name: 'Challenger Pro League', country: 'Belgium', nat: 'BEL', tier: 2,
    clubs: [
      ['Beerschot', '', '', '', 61, 'BEE'], ['Kortrijk', '', '', '', 61, 'KVK'], ['RWDM Brussels', '', '', '', 60, 'RWDM'], ['Lommel', '', '', '', 60, 'LOM'],
      ['Beveren', '', '', '', 60, 'BEV'], ['Eupen', '', '', '', 59, 'EUP'], ['Patro Eisden Maasmechelen', '', '', '', 59, 'PAT'], ['Lierse', '', '', '', 59, 'LIE'],
      ['Francs Borains', '', '', '', 58, 'FBO'], ['Lokeren', '', '', '', 58, 'LOK'], ['RFC Liège', '', '', '', 58, 'RFCL'], ['Seraing', '', '', '', 58, 'SER'],
      ['Olympic Charleroi', '', '', '', 57, 'OLY'], ['Club NXT', '', '', '', 58, 'NXT'], ['Jong Genk', '', '', '', 57, 'JGNK'], ['Jong KAA Gent', '', '', '', 56, 'JGNT'],
      ['RSCA Futures', '', '', '', 57, 'RSCA'],
    ],
  },
  {
    id: 'BEL3', name: 'Belgian Division 1', country: 'Belgium', nat: 'BEL', tier: 3,
    clubs: [
      ['Roeselare', '', '', '', 54, 'ROE'], ['Knokke', '', '', '', 54, 'KNO'], ['Dessel', '', '', '', 54, 'DES'], ['Hasselt', '', '', '', 53, 'HAS'],
      ['Tienen', '', '', '', 53, 'TIE'], ['Belisia Bilzen', '', '', '', 53, 'BEL'], ['Lyra-Lierse', '', '', '', 53, 'LYR'], ['Thes Sport', '', '', '', 52, 'THE'],
      ['Houtvenne', '', '', '', 52, 'HOU'], ['Ninove', '', '', '', 52, 'NIN'], ['Merelbeke', '', '', '', 52, 'MER'], ['Virton', '', '', '', 54, 'VIR'],
      ['RAEC Mons', '', '', '', 54, 'MON'], ['Union Namur', '', '', '', 53, 'NAM'], ['Tubize-Braine', '', '', '', 52, 'TUB'], ['Crossing Schaerbeek', '', '', '', 52, 'CRO'],
    ],
  },
);
Object.assign(NAME_POOLS, {
  BEL: [['Lucas', 'Arthur', 'Louis', 'Noah', 'Jules', 'Victor', 'Wout', 'Senne', 'Arne', 'Maxime', 'Thibault', 'Jens', 'Robbe', 'Mathis'], ['Peeters', 'Janssens', 'Maes', 'Jacobs', 'Mertens', 'Willems', 'Claes', 'Goossens', 'Wouters', 'Dubois', 'Lambert', 'Dupont', 'Martin', 'Leroy']],
});
