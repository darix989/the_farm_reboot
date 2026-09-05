import { Scene } from 'phaser';
import { EventBus } from '../EventBus';
import {
  FARM_INTERACT_RADIUS,
  FARM_NPCS,
  FARM_SPAWN,
  FARM_WORLD_HEIGHT,
  FARM_WORLD_WIDTH,
  FARM_ZONES,
  type FarmNpc,
} from '../../data/farmMap';
import { ensureFarmTextures, farmZoneTextureKey } from '../farm/farmTextures';
import { createFarmKeys, movementVector, type FarmKeys } from '../farm/farmInput';
import { VirtualJoystick } from '../farm/VirtualJoystick';
import { farmPalette } from '../farm/farmPalette';
import { useGameStore } from '../../store/gameStore';
import { useFarmStore } from '../../store/farmStore';
import { PLAYER_CHARACTER_ID, resolveCharacter } from '../../data/characters';
import getLabel from '../../data/labels';
import { animalSetup } from '../animals/animalAnimations';
import { attachAnimalAnimator, type AnimalAnimator } from '../animals/AnimalAnimator';
import { ANIMAL_STAGING } from '../animals/animalStaging';

const PLAYER_SPEED = 167; // slowed twice by 30% from the 340 the overworld shipped with
/** Player body is smaller than the sprite so Rue's feet, not his head, hit walls. */
const PLAYER_BODY = { width: 38, height: 28, offsetX: 9, offsetY: 24 };
/**
 * Vertical offset from the (invisible) physics body's centre down to where the animated
 * art's feet should sit. Half the body height plus its own top offset, tuned by eye.
 */
const PLAYER_ART_FEET_OFFSET = 18;

/**
 * Green Meadows Farm — the Level 1 overworld.
 *
 * The scene owns simulation only: terrain, collision, movement and which animal is
 * in range. All conversation UI is React (`FarmUI`), reached through `farmStore`.
 *
 * Launching an encounter uses `scene.start('Trial')`, which stops this scene, so it
 * never renders behind the debate panels. The player's position is written to
 * `gameStore` on shutdown and read back on `create`, so leaving and returning puts
 * Rue back where he stood.
 */
export class Farm extends Scene {
  /** Physics body only — invisible once animated art is available. See `spawnPlayer`. */
  private player!: Phaser.Physics.Arcade.Sprite;
  private playerArt: Phaser.GameObjects.Sprite | null = null;
  private playerAnimator: AnimalAnimator | null = null;
  private keys: FarmKeys | null = null;
  private joystick: VirtualJoystick | null = null;
  private npcActors: { npc: FarmNpc; animator: AnimalAnimator | null }[] = [];
  private moveVector = new Phaser.Math.Vector2();
  /** Whether the walk cycle is currently running, so it is started and stopped on the frame
   *  the player actually starts and stops moving rather than re-triggered every frame. */
  private walking = false;
  private solids!: Phaser.Physics.Arcade.StaticGroup;

  constructor() {
    super('Farm');
  }

  create() {
    ensureFarmTextures(this);
    useFarmStore.getState().resetFarmUi();

    this.physics.world.setBounds(0, 0, FARM_WORLD_WIDTH, FARM_WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, FARM_WORLD_WIDTH, FARM_WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor(farmPalette.grass);

    this.solids = this.physics.add.staticGroup();
    this.paintZones();
    this.spawnNpcs();
    this.spawnPlayer();

    this.physics.add.collider(this.player, this.solids);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.keys = createFarmKeys(this);
    this.joystick = new VirtualJoystick(this);

    this.keys?.interact.forEach((key) => {
      key.on('down', () => this.tryInteract());
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.persistPosition, this);

    EventBus.emit('current-scene-ready', this);
  }

  /** Terrain is tiled images; anything `solid` also gets a static body. */
  private paintZones(): void {
    FARM_ZONES.forEach((zone) => {
      this.add
        .tileSprite(zone.x, zone.y, zone.width, zone.height, farmZoneTextureKey(zone.kind))
        .setOrigin(0, 0)
        .setDepth(0);

      if (zone.label) {
        this.add
          .text(zone.x + zone.width / 2, zone.y + zone.height / 2, getLabel(zone.label), {
            fontFamily: 'Arial Black',
            fontSize: 28,
            color: farmPalette.worldLabel,
            stroke: farmPalette.worldLabelStroke,
            strokeThickness: 6,
          })
          .setOrigin(0.5)
          .setDepth(1);
      }

      if (!zone.solid) return;
      // `add.rectangle` centres on its coordinates, and a static body is built from
      // that centre — calling `setOrigin(0, 0)` afterwards moves the drawing but not
      // the body. Zones are authored as top-left rects, so convert to a centre here.
      const body = this.add.rectangle(
        zone.x + zone.width / 2,
        zone.y + zone.height / 2,
        zone.width,
        zone.height,
      );
      body.setVisible(false);
      this.physics.add.existing(body, true);
      this.solids.add(body);
    });
  }

  private spawnNpcs(): void {
    this.npcActors = FARM_NPCS.map((npc) => {
      const visual = resolveCharacter(npc.id);
      const shadow = this.add.image(npc.x, npc.y + 6, 'farm-shadow').setDepth(npc.y - 1);

      let animator: AnimalAnimator | null = null;
      let nameY = npc.y + 44;

      if (visual.animal && this.textures.exists(visual.animal)) {
        const setup = animalSetup(visual.animal);
        const sprite = this.add
          .sprite(npc.x, npc.y, setup.textureKey, setup.restFrameName)
          .setOrigin(0.5, 1) // y is the animal's feet
          .setScale(ANIMAL_STAGING[visual.animal].farmScale)
          .setDepth(npc.y);
        shadow.setScale(sprite.displayWidth / 56, 1);
        animator = attachAnimalAnimator(sprite, setup, { staging: 'farm' });
        animator?.playIdle();
        nameY = npc.y + 12;
      } else {
        // No art for this character: the original tinted placeholder.
        this.add.image(npc.x, npc.y, 'farm-npc').setTint(visual.tint).setDepth(npc.y);
      }

      this.add
        .text(npc.x, nameY, visual.displayName, {
          fontFamily: 'Arial Black',
          fontSize: 20,
          color: farmPalette.worldLabel,
          stroke: farmPalette.worldLabelStroke,
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(npc.y + 1);

      return { npc, animator };
    });
  }

  private spawnPlayer(): void {
    // Returning from an encounter restores the saved spot; a first visit uses the yard.
    const saved = useGameStore.getState().player.position;
    const hasSaved = saved.x !== 0 || saved.y !== 0;
    const x = hasSaved ? saved.x : FARM_SPAWN.x;
    const y = hasSaved ? saved.y : FARM_SPAWN.y;

    this.player = this.physics.add.sprite(x, y, 'farm-player').setDepth(y);
    this.player.setCollideWorldBounds(true);
    this.player.body?.setSize(PLAYER_BODY.width, PLAYER_BODY.height);
    this.player.body?.setOffset(PLAYER_BODY.offsetX, PLAYER_BODY.offsetY);

    // Arcade bodies size themselves from the current frame, and these atlases' frames vary
    // wildly in trimmed size — attaching the body straight to an animated sprite would make
    // Rue's collider breathe with his animation. So the body stays on the invisible
    // placeholder and the animated art follows it as a separate sprite. Do not "simplify"
    // this by moving the body onto `playerArt`.
    const visual = resolveCharacter(PLAYER_CHARACTER_ID);
    if (visual.animal && this.textures.exists(visual.animal)) {
      const setup = animalSetup(visual.animal);
      this.player.setVisible(false);
      this.playerArt = this.add
        .sprite(x, y + PLAYER_ART_FEET_OFFSET, setup.textureKey, setup.restFrameName)
        .setOrigin(0.5, 1)
        .setScale(ANIMAL_STAGING[visual.animal].farmScale)
        .setDepth(y);
      // No desync delay for the player: that range exists to scatter a herd told to react in
      // the same frame, and Rue is one animal answering the key the human just pressed.
      this.playerAnimator = attachAnimalAnimator(this.playerArt, setup, {
        staging: 'farm',
        desyncDelayMs: [0, 0],
      });
      this.playerAnimator?.playIdle();
    }
  }

  update(): void {
    if (!this.player.body) return;

    // Freeze while a conversation is open so Rue does not wander mid-sentence.
    if (useFarmStore.getState().talkingToNpcId) {
      this.player.setVelocity(0, 0);
      this.stopWalking();
      return;
    }

    const dir = movementVector(this.keys, this.joystick, this.moveVector);
    this.player.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED);
    // Depth-sort against NPCs so Rue walks behind animals standing further down.
    this.player.setDepth(this.player.y);

    if (this.playerArt) {
      this.playerArt.setPosition(this.player.x, this.player.y + PLAYER_ART_FEET_OFFSET);
      this.playerArt.setDepth(this.player.y);
      if (dir.x !== 0) this.playerArt.setFlipX(dir.x > 0); // art faces left by default
    }

    // `dir` is <= 1 and keeps the joystick's analogue magnitude (see `movementVector`), so it
    // doubles as the fraction of top speed to pace the walk cycle at: a half-pushed stick
    // moves Rue at half speed and steps at half rate. `playMove` is cheap to repeat.
    const speed = dir.length();
    if (speed > 0) {
      this.playerAnimator?.playMove(speed);
      this.walking = true;
    } else {
      this.stopWalking();
    }

    this.updateNearbyNpc();
  }

  /** Back to idling the moment Rue comes to rest — `immediate`, or he marches on the spot for
   *  the rest of the stride after the key is released. */
  private stopWalking(): void {
    if (!this.walking) return;
    this.walking = false;
    this.playerAnimator?.playIdle(/* immediate */ true);
  }

  private updateNearbyNpc(): void {
    let closestId: string | null = null;
    let closestDist = FARM_INTERACT_RADIUS;

    this.npcActors.forEach(({ npc }) => {
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, npc.x, npc.y);
      if (d < closestDist) {
        closestDist = d;
        closestId = npc.id;
      }
    });

    // The store no-ops when the value is unchanged, so this is safe every frame.
    useFarmStore.getState().setNearbyNpc(closestId);
  }

  /** Space / E / Enter opens the nearest animal's conversation. */
  private tryInteract(): void {
    const { nearbyNpcId, talkingToNpcId, openDialogue } = useFarmStore.getState();
    if (talkingToNpcId || !nearbyNpcId) return;
    openDialogue(nearbyNpcId);
  }

  private persistPosition(): void {
    if (!this.player) return;
    useGameStore.getState().updatePlayerPosition(this.player.x, this.player.y);
    this.joystick?.destroy();
    this.joystick = null;
    this.playerAnimator?.destroy();
    this.playerAnimator = null;
    this.npcActors.forEach(({ animator }) => animator?.destroy());
  }
}
