# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e6]:
    - generic [ref=e8]:
      - img "Logo" [ref=e10]
      - heading "Login" [level=2] [ref=e12]
      - generic [ref=e13]:
        - generic [ref=e14]:
          - text: Email or Username
          - textbox "Email or Username" [ref=e15]
        - generic [ref=e16]:
          - text: Password
          - generic [ref=e17]:
            - textbox "Password" [ref=e18]
            - button [ref=e19] [cursor=pointer]:
              - img [ref=e20]
        - generic [ref=e23]:
          - checkbox "Remember my email/username" [ref=e24] [cursor=pointer]
          - generic [ref=e25] [cursor=pointer]: Remember my email/username
        - button "Login" [ref=e26] [cursor=pointer]
    - generic [ref=e27]:
      - img "Casino" [ref=e28]
      - heading "Casino Management System" [level=2] [ref=e30]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e36] [cursor=pointer]:
    - img [ref=e37]
  - alert [ref=e40]
```