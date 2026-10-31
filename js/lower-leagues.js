// Second and third tiers for each country, based on 2025-26.
// Row: [club, manager, managerNation, "Name,POS,birthYear,NAT,OVR;..." (optional notable players), squadLevel]
// squadLevel is the typical rating of the club's generated players. A blank manager gets a generated name.
// Primera Federación and Serie C are split into regional groups in real life; here they are one 20-club league.

DB.leagues.forEach(l => { l.tier = 1; });

DB.leagues.push(
  {
    id: 'ENG2', name: 'Championship', country: 'England', nat: 'ENG', tier: 2,
    clubs: [
      ['Birmingham City', 'Chris Davies', 'WAL', 'Jay Stansfield,ST,2003,ENG,72;Tomoki Iwata,CDM,1997,JPN,71', 69],
      ['Blackburn Rovers', 'Michael O\'Neill', 'NIR', '', 66],
      ['Bristol City', 'Gerhard Struber', 'AUT', 'Scott Twine,CAM,1999,ENG,71', 67],
      ['Charlton Athletic', 'Nathan Jones', 'WAL', '', 65],
      ['Coventry City', 'Frank Lampard', 'ENG', 'Haji Wright,ST,1998,USA,74;Ellis Simms,ST,2001,ENG,71', 70],
      ['Derby County', 'John Eustace', 'ENG', '', 66],
      ['Hull City', 'Sergej Jakirović', 'CRO', '', 66],
      ['Ipswich Town', 'Kieran McKenna', 'NIR', 'Jaden Philogene,LW,2002,ENG,74;George Hirst,ST,1999,SCO,72;Sammie Szmodics,CAM,1995,IRL,72', 70],
      ['Leicester City', 'Martí Cifuentes', 'ESP', 'Abdul Fatawu,RW,2004,GHA,75;Stephy Mavididi,LW,1998,ENG,74;Harry Winks,CM,1996,ENG,74;Jordan Ayew,ST,1991,GHA,72', 70],
      ['Middlesbrough', 'Kim Hellberg', 'SWE', '', 68],
      ['Millwall', 'Alex Neil', 'SCO', '', 67],
      ['Norwich City', 'Philippe Clement', 'BEL', '', 67],
      ['Oxford United', '', '', '', 64],
      ['Portsmouth', 'John Mousinho', 'ENG', '', 65],
      ['Preston North End', 'Paul Heckingbottom', 'ENG', '', 66],
      ['Queens Park Rangers', 'Julien Stéphan', 'FRA', '', 66],
      ['Sheffield United', 'Chris Wilder', 'ENG', '', 67],
      ['Sheffield Wednesday', 'Henrik Pedersen', 'DEN', '', 63],
      ['Southampton', 'Tonda Eckert', 'GER', 'Taylor Harwood-Bellis,CB,2002,ENG,75;Flynn Downes,CM,1999,ENG,73;Adam Armstrong,ST,1997,ENG,73;Gavin Bazunu,GK,2002,IRL,72', 70],
      ['Stoke City', 'Mark Robins', 'ENG', '', 66],
      ['Swansea City', 'Vítor Matos', 'POR', '', 66],
      ['Watford', '', '', '', 66],
      ['West Bromwich Albion', '', '', '', 67],
      ['Wrexham', 'Phil Parkinson', 'ENG', 'Kieffer Moore,ST,1992,WAL,72', 67],
    ],
  },
  {
    id: 'ENG3', name: 'League One', country: 'England', nat: 'ENG', tier: 3,
    clubs: [
      ['AFC Wimbledon', 'Johnnie Jackson', 'ENG', '', 59], ['Barnsley', 'Conor Hourihane', 'IRL', '', 61], ['Blackpool', 'Steve Bruce', 'ENG', '', 61],
      ['Bolton Wanderers', 'Steven Schumacher', 'ENG', '', 63], ['Bradford City', 'Graham Alexander', 'SCO', '', 61], ['Burton Albion', 'Gary Bowyer', 'ENG', '', 59],
      ['Cardiff City', 'Brian Barry-Murphy', 'IRL', '', 64], ['Doncaster Rovers', 'Grant McCann', 'NIR', '', 61], ['Exeter City', 'Gary Caldwell', 'SCO', '', 59],
      ['Huddersfield Town', 'Lee Grant', 'ENG', '', 63], ['Leyton Orient', 'Richie Wellens', 'ENG', '', 60], ['Lincoln City', 'Michael Skubala', 'ENG', '', 61],
      ['Luton Town', 'Jack Wilshere', 'ENG', '', 63], ['Mansfield Town', 'Nigel Clough', 'ENG', '', 60], ['Northampton Town', 'Kevin Nolan', 'ENG', '', 59],
      ['Peterborough United', 'Darren Ferguson', 'SCO', '', 60], ['Plymouth Argyle', 'Tom Cleverley', 'ENG', '', 62], ['Port Vale', 'Darren Moore', 'JAM', '', 59],
      ['Reading', 'Leam Richardson', 'ENG', '', 61], ['Rotherham United', 'Matt Hamshaw', 'ENG', '', 60], ['Stevenage', 'Alex Revell', 'ENG', '', 60],
      ['Stockport County', 'Dave Challinor', 'ENG', '', 62], ['Wigan Athletic', 'Ryan Lowe', 'ENG', '', 61], ['Wycombe Wanderers', 'Michael Duff', 'ENG', '', 61],
    ],
  },
  {
    id: 'ESP2', name: 'Segunda División', country: 'Spain', nat: 'ESP', tier: 2,
    clubs: [
      ['Albacete', 'Alberto González', 'ESP', '', 65], ['Almería', 'Rubi', 'ESP', '', 68], ['Burgos', 'Luis Miguel Ramis', 'ESP', '', 65],
      ['Cádiz', 'Gaizka Garitano', 'ESP', '', 67], ['Castellón', 'Pablo Hernández', 'ESP', '', 66], ['Ceuta', 'José Juan Romero', 'ESP', '', 63],
      ['Córdoba', 'Iván Ania', 'ESP', '', 65], ['Cultural Leonesa', 'Raúl Llona', 'ESP', '', 63], ['Deportivo La Coruña', 'Antonio Hidalgo', 'ESP', '', 67],
      ['Eibar', 'Beñat San José', 'ESP', '', 65], ['Granada', 'Pacheta', 'ESP', '', 66], ['Huesca', '', '', '', 64],
      ['Las Palmas', 'Luis García', 'ESP', '', 68], ['Leganés', 'Paco López', 'ESP', '', 67], ['Málaga', 'Juan Francisco Funes', 'ESP', '', 66],
      ['Mirandés', '', '', '', 64], ['Racing Santander', 'José Alberto López', 'ESP', '', 67], ['Real Sociedad B', 'Jon Ansotegi', 'ESP', '', 63],
      ['Real Valladolid', 'Guillermo Almada', 'URU', '', 67], ['Real Zaragoza', 'Rubén Sellés', 'ESP', '', 65], ['Sporting Gijón', 'Borja Jiménez', 'ESP', '', 66],
      ['Andorra', '', '', '', 64],
    ],
  },
  {
    id: 'ESP3', name: 'Primera Federación', country: 'Spain', nat: 'ESP', tier: 3,
    clubs: [
      ['Real Madrid Castilla', '', '', '', 61], ['Barcelona Atlètic', '', '', '', 61], ['Atlético Madrileño', '', '', '', 60], ['Celta Fortuna', '', '', '', 59],
      ['Ponferradina', '', '', '', 60], ['Gimnàstic Tarragona', '', '', '', 60], ['Hércules', '', '', '', 60], ['Real Murcia', '', '', '', 60],
      ['Alcorcón', '', '', '', 59], ['Tenerife', '', '', '', 61], ['Villarreal B', '', '', '', 59], ['Cartagena', '', '', '', 60],
      ['Sabadell', '', '', '', 59], ['Lugo', '', '', '', 59], ['Racing Ferrol', '', '', '', 59], ['Ibiza', '', '', '', 59],
      ['Algeciras', '', '', '', 58], ['Mérida', '', '', '', 58], ['Antequera', '', '', '', 58], ['Betis Deportivo', '', '', '', 58],
    ],
  },
  {
    id: 'ITA2', name: 'Serie B', country: 'Italy', nat: 'ITA', tier: 2,
    clubs: [
      ['Avellino', 'Raffaele Biancolino', 'ITA', '', 63], ['Bari', '', '', '', 64], ['Carrarese', 'Antonio Calabro', 'ITA', '', 63],
      ['Catanzaro', 'Alberto Aquilani', 'ITA', '', 65], ['Cesena', 'Michele Mignani', 'ITA', '', 64], ['Empoli', '', '', '', 66],
      ['Frosinone', 'Massimiliano Alvini', 'ITA', '', 65], ['Juve Stabia', 'Ignazio Abate', 'ITA', '', 63], ['Mantova', 'Davide Possanzini', 'ITA', '', 63],
      ['Modena', 'Andrea Sottil', 'ITA', '', 65], ['Monza', 'Paolo Bianco', 'ITA', '', 67], ['Padova', 'Matteo Andreoletti', 'ITA', '', 63],
      ['Palermo', 'Filippo Inzaghi', 'ITA', 'Joel Pohjanpalo,ST,1994,FIN,74', 67], ['Pescara', 'Giorgio Gorgone', 'ITA', '', 62], ['Reggiana', 'Davide Dionigi', 'ITA', '', 63],
      ['Sampdoria', '', '', '', 65], ['Spezia', 'Roberto Donadoni', 'ITA', '', 65], ['Südtirol', 'Fabrizio Castori', 'ITA', '', 63],
      ['Venezia', 'Giovanni Stroppa', 'ITA', '', 67], ['Virtus Entella', 'Andrea Chiappella', 'ITA', '', 62],
    ],
  },
  {
    id: 'ITA3', name: 'Serie C', country: 'Italy', nat: 'ITA', tier: 3,
    clubs: [
      ['Vicenza', '', '', '', 60], ['Triestina', '', '', '', 58], ['Union Brescia', '', '', '', 60], ['Lecco', '', '', '', 58],
      ['Arzignano', '', '', '', 57], ['Trento', '', '', '', 57], ['Novara', '', '', '', 58], ['Alcione Milano', '', '', '', 57],
      ['Pro Vercelli', '', '', '', 57], ['Ternana', '', '', '', 59], ['Arezzo', '', '', '', 59], ['Perugia', '', '', '', 59],
      ['Ascoli', '', '', '', 59], ['Torres', '', '', '', 57], ['Gubbio', '', '', '', 57], ['Benevento', '', '', '', 60],
      ['Catania', '', '', '', 60], ['Salernitana', '', '', '', 60], ['Crotone', '', '', '', 58], ['Cosenza', '', '', '', 58],
    ],
  },
  {
    id: 'GER2', name: '2. Bundesliga', country: 'Germany', nat: 'GER', tier: 2,
    clubs: [
      ['Hertha BSC', 'Stefan Leitl', 'GER', 'Fabian Reese,LW,1997,GER,74', 68], ['Schalke 04', 'Miron Muslić', 'BIH', '', 68], ['Hannover 96', 'Christian Titz', 'GER', '', 67],
      ['Fortuna Düsseldorf', 'Markus Anfang', 'GER', '', 66], ['1. FC Kaiserslautern', 'Torsten Lieberknecht', 'GER', '', 67], ['Karlsruher SC', 'Christian Eichner', 'GER', '', 66],
      ['SC Paderborn', 'Ralf Kettemann', 'GER', '', 66], ['Darmstadt 98', 'Florian Kohfeldt', 'GER', '', 66], ['1. FC Nürnberg', 'Miroslav Klose', 'GER', '', 66],
      ['Holstein Kiel', 'Marcel Rapp', 'GER', '', 66], ['VfL Bochum', 'Uwe Rösler', 'GER', '', 67], ['Greuther Fürth', '', '', '', 64],
      ['Eintracht Braunschweig', 'Heiner Backhaus', 'GER', '', 64], ['Arminia Bielefeld', 'Mitch Kniat', 'GER', '', 65], ['Dynamo Dresden', 'Thomas Stamm', 'SUI', '', 64],
      ['Preußen Münster', 'Alexander Ende', 'GER', '', 64], ['1. FC Magdeburg', '', '', '', 65], ['SV Elversberg', 'Vincent Wagner', 'GER', '', 66],
    ],
  },
  {
    id: 'GER3', name: '3. Liga', country: 'Germany', nat: 'GER', tier: 3,
    clubs: [
      ['Energie Cottbus', 'Claus-Dieter Wollitz', 'GER', '', 61], ['MSV Duisburg', 'Dietmar Hirsch', 'GER', '', 61], ['Hansa Rostock', '', '', '', 61], ['1860 Munich', 'Markus Kauczinski', 'GER', '', 61],
      ['Alemannia Aachen', '', '', '', 60], ['Viktoria Köln', '', '', '', 59], ['Waldhof Mannheim', '', '', '', 60], ['SC Verl', '', '', '', 59],
      ['Erzgebirge Aue', '', '', '', 59], ['1. FC Saarbrücken', '', '', '', 60], ['VfL Osnabrück', '', '', '', 60], ['Rot-Weiss Essen', '', '', '', 60],
      ['Wehen Wiesbaden', '', '', '', 60], ['Jahn Regensburg', '', '', '', 60], ['SSV Ulm', '', '', '', 60], ['FC Ingolstadt', '', '', '', 60],
      ['TSG Hoffenheim II', '', '', '', 58], ['VfB Stuttgart II', '', '', '', 58], ['1. FC Schweinfurt', '', '', '', 57], ['TSV Havelse', '', '', '', 57],
    ],
  },
  {
    id: 'FRA2', name: 'Ligue 2', country: 'France', nat: 'FRA', tier: 2,
    clubs: [
      ['Saint-Étienne', 'Eirik Horneland', 'NOR', 'Lucas Stassin,ST,2004,BEL,74', 67], ['Montpellier', 'Zoumana Camara', 'FRA', '', 66], ['Reims', 'Karel Geraerts', 'BEL', '', 66],
      ['Le Mans', 'Patrice Garande', 'FRA', '', 63], ['Guingamp', 'Sylvain Ripoll', 'FRA', '', 63], ['Red Star', 'Grégory Poirier', 'FRA', '', 63],
      ['Amiens', '', '', '', 63], ['Annecy', '', '', '', 62], ['Bastia', '', '', '', 62], ['Boulogne', '', '', '', 61],
      ['Clermont', '', '', '', 63], ['Dunkerque', '', '', '', 63], ['Grenoble', '', '', '', 62], ['Laval', '', '', '', 62],
      ['Nancy', '', '', '', 62], ['Pau', '', '', '', 62], ['Rodez', '', '', '', 62], ['Troyes', 'Stéphane Dumont', 'FRA', '', 64],
    ],
  },
  {
    id: 'FRA3', name: 'National', country: 'France', nat: 'FRA', tier: 3,
    clubs: [
      ['Sochaux', '', '', '', 58], ['Valenciennes', '', '', '', 57], ['Caen', '', '', '', 59], ['Ajaccio', '', '', '', 57],
      ['Orléans', '', '', '', 57], ['Rouen', '', '', '', 57], ['Dijon', '', '', '', 58], ['Versailles', '', '', '', 57],
      ['Quevilly-Rouen', '', '', '', 57], ['Châteauroux', '', '', '', 56], ['Concarneau', '', '', '', 56], ['Bourg-Péronnas', '', '', '', 56],
      ['Aubagne', '', '', '', 55], ['Le Puy', '', '', '', 55], ['Fleury', '', '', '', 55], ['Paris 13 Atletico', '', '', '', 55],
      ['Villefranche', '', '', '', 56], ['Stade Briochin', '', '', '', 55],
    ],
  },
);

