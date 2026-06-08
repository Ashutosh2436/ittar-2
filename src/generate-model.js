import fs from 'fs';
import path from 'path';
import { 
  Scene, 
  Group, 
  Mesh, 
  CylinderGeometry, 
  BoxGeometry, 
  TorusGeometry, 
  SphereGeometry, 
  ConeGeometry, 
  MeshPhysicalMaterial, 
  MeshStandardMaterial,
  Color
} from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

// Polyfills for Node environment just in case GLTFExporter references them
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts, options) {
      this.parts = parts;
      this.options = options;
    }
  };
}

if (typeof global.FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(arrayBuffer => {
        this.result = arrayBuffer;
        setTimeout(() => {
          if (this.onload) this.onload({ target: this });
          if (this.onloadend) this.onloadend({ target: this });
        }, 0);
      }).catch(err => {
        console.error('FileReader polyfill error:', err);
      });
    }
  };
}

function createIttarBottle() {
  const bottleGroup = new Group();
  bottleGroup.name = 'IttarBottle';

  // --- MATERIAL DEFINITIONS ---
  
  // Luxury Gold Material
  const goldMaterial = new MeshStandardMaterial({
    name: 'LuxuryGold',
    color: new Color('#d4af37'),
    roughness: 0.15,
    metalness: 0.95,
  });

  // Dark Obsidian Glass Material (Outer Bottle)
  const glassMaterial = new MeshPhysicalMaterial({
    name: 'ObsidianGlass',
    color: new Color('#111114'),
    roughness: 0.05,
    metalness: 0.1,
    transmission: 0.9, // Semi-transparent glass
    ior: 1.62,          // Index of refraction for heavy crystal glass
    thickness: 0.25,   // Physical thickness for refraction
    transparent: true,
    opacity: 0.95
  });

  // Perfume Liquid Material (Amber/Gold Oil)
  const liquidMaterial = new MeshPhysicalMaterial({
    name: 'AmberLiquid',
    color: new Color('#d4af37'),
    roughness: 0.08,
    metalness: 0.0,
    transmission: 0.7,
    ior: 1.35,
    thickness: 0.2,
    transparent: true,
    opacity: 0.85
  });

  // Applicator Rod (Glass)
  const rodMaterial = new MeshPhysicalMaterial({
    name: 'GlassRod',
    color: new Color('#ffffff'),
    roughness: 0.05,
    transmission: 0.95,
    ior: 1.5,
    transparent: true,
    opacity: 0.8
  });

  // --- GEOMETRY CONSTRUCTION ---

  // 1. Outer Glass Body: Octagonal cylinder
  // Top radius: 0.85, Bottom radius: 0.95, Height: 2.2, Radial segments: 8
  const glassGeo = new CylinderGeometry(0.85, 0.95, 2.2, 8);
  const glassMesh = new Mesh(glassGeo, glassMaterial);
  glassMesh.name = 'GlassBody';
  glassMesh.castShadow = true;
  glassMesh.receiveShadow = true;
  bottleGroup.add(glassMesh);

  // 2. Liquid inside (Slightly smaller octagonal cylinder, offset inside)
  // Top: 0.65, Bottom: 0.75, Height: 1.7
  const liquidGeo = new CylinderGeometry(0.68, 0.78, 1.7, 8);
  const liquidMesh = new Mesh(liquidGeo, liquidMaterial);
  liquidMesh.name = 'PerfumeLiquid';
  liquidMesh.position.y = -0.15; // Set towards the bottom
  bottleGroup.add(liquidMesh);

  // 3. Applicator Rod / Dip Tube (thin cylinder going from cap down into liquid)
  const rodGeo = new CylinderGeometry(0.03, 0.03, 1.9, 8);
  const rodMesh = new Mesh(rodGeo, rodMaterial);
  rodMesh.name = 'ApplicatorRod';
  rodMesh.position.y = -0.05;
  bottleGroup.add(rodMesh);

  // 4. Neck & Collar (Gold rings transitioning to cap)
  const collarGeo = new CylinderGeometry(0.42, 0.45, 0.2, 32);
  const collarMesh = new Mesh(collarGeo, goldMaterial);
  collarMesh.name = 'GoldCollar';
  collarMesh.position.y = 1.2; // Placed on top of the bottle glass body (height/2 = 1.1)
  bottleGroup.add(collarMesh);

  const neckGeo = new CylinderGeometry(0.35, 0.35, 0.2, 32);
  const neckMesh = new Mesh(neckGeo, goldMaterial);
  neckMesh.name = 'GoldNeck';
  neckMesh.position.y = 1.4;
  bottleGroup.add(neckMesh);

  // 5. Ornate Cap (Gold Dome + Torus rings + Tip Cone)
  const capGroup = new Group();
  capGroup.name = 'CapGroup';
  capGroup.position.y = 1.5; // Offset to start above the neck

  // Cap Base Ring
  const capBaseGeo = new CylinderGeometry(0.36, 0.36, 0.1, 32);
  const capBaseMesh = new Mesh(capBaseGeo, goldMaterial);
  capBaseMesh.position.y = 0.05;
  capGroup.add(capBaseMesh);

  // Decorative Torus Ring (Faceted/embossed look)
  const torusGeo = new TorusGeometry(0.32, 0.08, 12, 24);
  const torusMesh = new Mesh(torusGeo, goldMaterial);
  torusMesh.rotation.x = Math.PI / 2;
  torusMesh.position.y = 0.15;
  capGroup.add(torusMesh);

  // Dome (Sphere scaled vertically)
  const domeGeo = new SphereGeometry(0.34, 32, 16);
  const domeMesh = new Mesh(domeGeo, goldMaterial);
  domeMesh.scale.set(1, 1.4, 1);
  domeMesh.position.y = 0.5;
  capGroup.add(domeMesh);

  // Top Spire tip (Cone)
  const tipGeo = new ConeGeometry(0.08, 0.3, 8);
  const tipMesh = new Mesh(tipGeo, goldMaterial);
  tipMesh.position.y = 1.05;
  capGroup.add(tipMesh);

  bottleGroup.add(capGroup);

  // 6. Premium Gold Label (Plate on front face, slightly curved or flat)
  const labelGeo = new BoxGeometry(0.7, 1.1, 0.03);
  const labelMesh = new Mesh(labelGeo, goldMaterial);
  labelMesh.name = 'GoldLabel';
  // Position it on the front face of the octagon
  // Radius of octagon is ~0.9. Face distance is ~0.83.
  labelMesh.position.set(0, -0.1, 0.88);
  bottleGroup.add(labelMesh);

  return bottleGroup;
}

function exportModel() {
  const scene = new Scene();
  const bottle = createIttarBottle();
  scene.add(bottle);

  console.log('Bottle model constructed successfully. Starting export...');

  const exporter = new GLTFExporter();
  
  // Set up export options
  const options = {
    binary: true,
    animations: [],
    includeCustomExtensions: true
  };

  exporter.parse(
    scene,
    (gltf) => {
      try {
        const assetsDir = path.resolve('public/assets');
        if (!fs.existsSync(assetsDir)) {
          fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        const outputFilePath = path.join(assetsDir, 'ittar_bottle.glb');
        fs.writeFileSync(outputFilePath, Buffer.from(gltf));
        console.log(`Successfully exported model to: ${outputFilePath}`);
        process.exit(0);
      } catch (err) {
        console.error('Error writing exported file:', err);
        process.exit(1);
      }
    },
    (err) => {
      console.error('An error occurred during gltf export parsing:', err);
      process.exit(1);
    },
    options
  );
}

exportModel();
