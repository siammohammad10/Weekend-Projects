using UnityEngine;
#if HEATCHECK_INPUT_SYSTEM && ENABLE_INPUT_SYSTEM
using UnityEngine.InputSystem;
#endif

namespace HeatCheck
{
    /// <summary>
    /// First-person controls for playing without a headset: WASD to walk, mouse to look,
    /// E or left click to use things, R to try again, Esc to free the mouse.
    /// Works with either the Input System package or the old Input Manager.
    /// </summary>
    [RequireComponent(typeof(CharacterController))]
    public sealed class DesktopPlayer : MonoBehaviour
    {
        [SerializeField] HeatCheckGame game;
        [SerializeField] Transform head;
        [SerializeField] float walkSpeed = 3f;
        [SerializeField] float carrySpeed = 2.2f;
        [SerializeField] float reach = 3f;

        [Tooltip("Mouse look speed, in degrees per pixel of mouse movement.")]
        [SerializeField] float lookSpeed = 0.12f;

        public Interactable Focus { get; private set; }

        CharacterController controller;
        Vector3 startPosition;
        float startYaw;
        float yaw;
        float pitch;
        float fallSpeed;

        void Awake()
        {
            controller = GetComponent<CharacterController>();
            startPosition = transform.position;
            startYaw = transform.eulerAngles.y;
            yaw = startYaw;
        }

        void OnEnable() => SetCursorLocked(true);

        void OnDisable() => SetCursorLocked(false);

        public void ReturnToStart()
        {
            controller.enabled = false;
            transform.position = startPosition;
            controller.enabled = true;
            yaw = startYaw;
            pitch = 0f;
            fallSpeed = 0f;
        }

        void Update()
        {
            var input = ReadInput();

            if (input.Escape) SetCursorLocked(false);
            else if (input.Click && Cursor.lockState != CursorLockMode.Locked)
            {
                // The first click only grabs the mouse again.
                SetCursorLocked(true);
                input.Use = false;
            }

            if (Cursor.lockState == CursorLockMode.Locked)
            {
                yaw += input.Look.x * lookSpeed;
                pitch = Mathf.Clamp(pitch - input.Look.y * lookSpeed, -80f, 80f);
            }

            transform.rotation = Quaternion.Euler(0f, yaw, 0f);
            head.localRotation = Quaternion.Euler(pitch, 0f, 0f) * Dizziness();

            Walk(input.Move);

            Focus = FindFocus();
            if (input.Use && Focus != null) Focus.TryUse(game);
            if (input.Restart && !game.Playing) game.Restart();
        }

        void Walk(Vector2 move)
        {
            float speed = game.Body.Carrying ? carrySpeed : walkSpeed;
            // Heat exhaustion makes you weak and slow.
            if (game.Body.Model.Stage >= HeatStage.HeatExhaustion) speed *= 0.7f;
            if (!game.Playing && game.State == HeatCheckGame.Phase.Collapsed) speed = 0f;

            var direction = transform.right * move.x + transform.forward * move.y;
            if (direction.sqrMagnitude > 1f) direction.Normalize();

            fallSpeed = controller.isGrounded ? -1f : fallSpeed - 9.81f * Time.deltaTime;
            controller.Move((direction * speed + Vector3.up * fallSpeed) * Time.deltaTime);
        }

        /// <summary>
        /// A slow sway of the view once heat exhaustion sets in. Desktop only: moving the view on its own
        /// in a headset makes people motion sick, so the XR version uses the screen edges instead.
        /// </summary>
        Quaternion Dizziness()
        {
            float t = game.Body.Model.TempF;
            float amount = Mathf.InverseLerp(HeatModel.ExhaustionF, HeatModel.StrokeF, t);
            if (amount <= 0f) return Quaternion.identity;
            float time = Time.time;
            return Quaternion.Euler(
                Mathf.Sin(time * 0.7f) * 1.5f * amount,
                Mathf.Sin(time * 0.45f) * 2.5f * amount,
                Mathf.Sin(time * 0.9f) * 4f * amount);
        }

        Interactable FindFocus()
        {
            if (!Physics.Raycast(head.position, head.forward, out var hit, reach, ~0, QueryTriggerInteraction.Collide))
                return null;
            var item = hit.collider.GetComponentInParent<Interactable>();
            return item != null && item.Prompt(game) != null ? item : null;
        }

        static void SetCursorLocked(bool locked)
        {
            Cursor.lockState = locked ? CursorLockMode.Locked : CursorLockMode.None;
            Cursor.visible = !locked;
        }

        struct Frame
        {
            public Vector2 Move;
            public Vector2 Look;
            public bool Use;
            public bool Click;
            public bool Restart;
            public bool Escape;
        }

#if !(HEATCHECK_INPUT_SYSTEM && ENABLE_INPUT_SYSTEM) && !ENABLE_LEGACY_INPUT_MANAGER
        static bool warnedNoInput;
#endif

        static Frame ReadInput()
        {
            var f = new Frame();
#if HEATCHECK_INPUT_SYSTEM && ENABLE_INPUT_SYSTEM
            var keyboard = Keyboard.current;
            var mouse = Mouse.current;
            if (keyboard != null)
            {
                f.Move.x = (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed ? 1f : 0f)
                    - (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed ? 1f : 0f);
                f.Move.y = (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed ? 1f : 0f)
                    - (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed ? 1f : 0f);
                f.Use = keyboard.eKey.wasPressedThisFrame;
                f.Restart = keyboard.rKey.wasPressedThisFrame;
                f.Escape = keyboard.escapeKey.wasPressedThisFrame;
            }
            if (mouse != null)
            {
                f.Look = mouse.delta.ReadValue();
                f.Click = mouse.leftButton.wasPressedThisFrame;
                f.Use |= f.Click;
            }
#elif ENABLE_LEGACY_INPUT_MANAGER
            f.Move = new Vector2(Input.GetAxisRaw("Horizontal"), Input.GetAxisRaw("Vertical"));
            // The old Input Manager reports mouse movement in its own units; scale it to roughly match pixels.
            f.Look = new Vector2(Input.GetAxisRaw("Mouse X"), Input.GetAxisRaw("Mouse Y")) * 10f;
            f.Click = Input.GetMouseButtonDown(0);
            f.Use = Input.GetKeyDown(KeyCode.E) || f.Click;
            f.Restart = Input.GetKeyDown(KeyCode.R);
            f.Escape = Input.GetKeyDown(KeyCode.Escape);
#else
            if (!warnedNoInput)
            {
                warnedNoInput = true;
                Debug.LogWarning("Heat Check: no keyboard or mouse input. Install the Input System package (Window → Package Manager) and restart Unity.");
            }
#endif
            return f;
        }
    }
}
