import {
  plainText,
  option,
  options,
  button,
  image,
  overflow,
  radioButtons,
  checkboxes,
  datePicker,
  timePicker,
  dateTimePicker,
  staticSelect,
  usersSelect,
  multiUsersSelect,
  conversationsSelect,
  multiConversationsSelect,
  channelsSelect,
  multiChannelsSelect,
  externalSelect,
  multiExternalSelect,
  section,
  sectionFields,
  header,
  divider,
  actions,
  context,
  imageBlock,
  richText,
  richLink,
  richEmoji,
  richSection,
  richPreformatted,
  richQuote,
  richList,
  richTextBlock,
  cell,
  table,
} from '@botarium/block-kit'

const today = new Date()
const yyyy = today.getFullYear()
const mm = String(today.getMonth() + 1).padStart(2, '0')
const dd = String(today.getDate()).padStart(2, '0')
const todayDate = `${yyyy}-${mm}-${dd}`
const todayNoonUnix = Math.floor(
  new Date(`${todayDate}T12:00:00Z`).getTime() / 1000
)

export const blockKitMessages = [
  // 01 - Text & Layout
  {
    text: 'Text & Layout Blocks',
    blocks: [
      header('Block Kit Showcase'),
      section(
        '*Bold text*, _italic text_, ~strikethrough~, `inline code`, <https://slack.com|a link>, and a blockquote:\n> This is a blockquote with *formatting*'
      ),
      sectionFields([
        '*Field 1*\nLeft column value',
        '_Field 2_\nRight column value',
      ]),
      context([
        image('https://placecats.com/32/32', 'cat avatar'),
        'Posted by *Showcase Bot* | Context block with image and text',
      ]),
      divider(),
      imageBlock('https://placecats.com/300/200', 'A placeholder cat image', {
        title: 'Image Block',
      }),
    ],
  },

  // 02 - Button Variations
  {
    text: 'Button Variations',
    blocks: [
      header('Buttons'),
      actions([
        button('Primary', 'showcase_button_primary', {
          value: 'primary_clicked',
          style: 'primary',
        }),
        button('Danger', 'showcase_button_danger', {
          value: 'danger_clicked',
          style: 'danger',
        }),
        button('Default', 'showcase_button_default', {
          value: 'default_clicked',
        }),
      ]),
    ],
  },

  // 03 - Selection Elements
  {
    text: 'Selection Elements',
    blocks: [
      header('Selection Elements'),
      actions([
        staticSelect(
          'showcase_static_select',
          options([
            ['Option A', 'option_a'],
            ['Option B', 'option_b'],
            ['Option C', 'option_c'],
          ]),
          { placeholder: 'Choose an option' }
        ),
        overflow(
          'showcase_overflow',
          options([
            ['Edit', 'edit'],
            ['Archive', 'archive'],
            ['Delete', 'delete'],
          ])
        ),
      ]),
    ],
  },

  // 04 - Radio Buttons & Checkboxes
  {
    text: 'Radio Buttons & Checkboxes',
    blocks: [
      header('Radio Buttons & Checkboxes'),
      section('*Size Selection* (radio buttons accessory)', {
        accessory: radioButtons('showcase_radio_size', [
          option('Small', 'small', { description: 'Compact layout' }),
          option('Medium', 'medium', { description: 'Standard layout' }),
          option('Large', 'large', { description: 'Expanded layout' }),
        ]),
      }),
      section('*Notification Preferences* (checkboxes accessory)', {
        accessory: checkboxes('showcase_checkbox_notifications', [
          option('Email', 'email', { description: 'Daily digest' }),
          option('SMS', 'sms', { description: 'Urgent only' }),
          option('Push', 'push', { description: 'Real-time alerts' }),
        ]),
      }),
      actions([
        radioButtons(
          'showcase_radio_priority',
          options([
            ['Low', 'low'],
            ['Medium', 'medium'],
            ['High', 'high'],
          ])
        ),
        checkboxes(
          'showcase_checkbox_features',
          options([
            ['Dark mode', 'dark_mode'],
            ['Notifications', 'notifications'],
            ['Auto-save', 'auto_save'],
          ])
        ),
      ]),
    ],
  },

  // 05 - Date & Time Pickers
  {
    text: 'Date & Time Pickers',
    blocks: [
      header('Date & Time Pickers'),
      actions([
        datePicker('showcase_datepicker', {
          initial_date: todayDate,
          placeholder: 'Select a date',
        }),
        timePicker('showcase_timepicker', {
          initial_time: '09:00',
          placeholder: 'Select a time',
        }),
        dateTimePicker('showcase_datetimepicker', {
          initial_date_time: todayNoonUnix,
        }),
      ]),
      section('*Delivery Date* (datepicker accessory)', {
        accessory: datePicker('showcase_datepicker_accessory', {
          initial_date: todayDate,
          placeholder: 'Select a delivery date',
        }),
      }),
      section('*Meeting Time* (timepicker accessory)', {
        accessory: timePicker('showcase_timepicker_accessory', {
          initial_time: '14:30',
          placeholder: 'Choose a meeting time',
        }),
      }),
    ],
  },

  // 06 - Section Accessories
  {
    text: 'Section Accessories',
    blocks: [
      header('Section Accessories'),
      section('Click the action button', {
        accessory: button('Action', 'showcase_section_button', {
          value: 'section_button_clicked',
        }),
      }),
      section('Choose a priority', {
        accessory: staticSelect(
          'showcase_section_select',
          options([
            ['Low', 'low'],
            ['Medium', 'medium'],
            ['High', 'high'],
            ['Critical', 'critical'],
          ]),
          { placeholder: 'Select priority' }
        ),
      }),
      section('More options available', {
        accessory: overflow(
          'showcase_section_overflow',
          options([
            ['Settings', 'settings'],
            ['Help', 'help'],
            ['About', 'about'],
          ])
        ),
      }),
      section('Section with an image accessory', {
        accessory: image('https://placecats.com/128/128', 'A cute cat'),
      }),
    ],
  },

  // 07 - Combined Actions
  {
    text: 'Combined Actions',
    blocks: [
      header('Combined Actions'),
      actions([
        button('Submit', 'showcase_combined_button', {
          style: 'primary',
          value: 'submit',
        }),
        staticSelect(
          'showcase_combined_select',
          options([
            ['Alpha', 'alpha'],
            ['Beta', 'beta'],
            ['Gamma', 'gamma'],
          ]),
          { placeholder: 'Pick one' }
        ),
        datePicker('showcase_combined_datepicker', {
          initial_date: todayDate,
          placeholder: 'Pick a date',
        }),
        overflow(
          'showcase_combined_overflow',
          options([
            ['Export', 'export'],
            ['Print', 'print'],
            ['Share', 'share'],
          ])
        ),
      ]),
    ],
  },

  // 08 - Rich Text
  {
    text: 'Rich Text',
    blocks: [
      richTextBlock([
        richSection([
          'Check out these different block types with paragraph breaks between them:\n\n',
        ]),
        richPreformatted([
          'Hello there, I am preformatted block!\n\nI can have multiple paragraph breaks within the block.',
        ]),
        richSection([
          '\nI am rich text with a paragraph break following preformatted text. \n\nI can have multiple paragraph breaks within the block.\n\n',
        ]),
        richQuote([
          'I am a basic rich text quote, \n\nI can have multiple paragraph breaks within the block.',
        ]),
        richSection([
          '\nI am rich text with a paragraph after the quote block\n\n',
        ]),
        richQuote(['I am a basic quote block following rich text']),
        richSection(['\n']),
        richPreformatted([
          'I am more preformatted text following a quote block',
        ]),
        richSection(['\n']),
        richQuote(['I am a basic quote block following preformatted text']),
        richSection(['\n']),
        richList(
          'bullet',
          [richSection(['list item one']), richSection(['list item two'])],
          { indent: 0 }
        ),
        richSection(['\nI am rich text with a paragraph break after a list']),
      ]),
      context([
        '*This* is :smile: markdown',
        image(
          'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
          'cute cat'
        ),
        image(
          'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
          'cute cat'
        ),
        image(
          'https://pbs.twimg.com/profile_images/625633822235693056/lNGUneLX_400x400.jpg',
          'cute cat'
        ),
        plainText('Author: K A Applegate'),
      ]),
    ],
  },

  // 09 - Template: Newsletter
  {
    text: 'Newsletter',
    blocks: [
      header(':newspaper:  Paper Company Newsletter  :newspaper:'),
      context(['*November 12, 2019*  |  Sales Team Announcements']),
      divider(),
      section(' :loud_sound: *IN CASE YOU MISSED IT* :loud_sound:'),
      section(
        'Replay our screening of *Threat Level Midnight* and pick up a copy of the DVD to give to your customers at the front desk.',
        {
          accessory: button('Watch Now', 'showcase_newsletter_watch'),
        }
      ),
      section(
        'The *2019 Dundies* happened. \nAwards were given, heroes were recognized. \nCheck out *#dundies-2019* to see who won awards.'
      ),
      divider(),
      section(':calendar: |   *UPCOMING EVENTS*  | :calendar: '),
      section(
        '`11/20-11/22` *Beet the Competition* _ annual retreat at Schrute Farms_',
        {
          accessory: button('RSVP', 'showcase_newsletter_rsvp_retreat'),
        }
      ),
      section("`12/01` *Toby's Going Away Party* at _Benihana_", {
        accessory: button('Learn More', 'showcase_newsletter_learn_more'),
      }),
      section(
        '`11/13` :pretzel: *Pretzel Day* :pretzel: at _Scranton Office_',
        {
          accessory: button('RSVP', 'showcase_newsletter_rsvp_pretzel'),
        }
      ),
      divider(),
      section(':calendar: |   *PAST EVENTS*  | :calendar: '),
      section('`10/21` *Conference Room Meeting*', {
        accessory: button('Watch Recording', 'showcase_newsletter_recording'),
      }),
      divider(),
      section('*FOR YOUR INFORMATION*'),
      section(
        ':printer: *Sabre Printers* are no longer catching on fire! The newest version of our printers are safe to use. Make sure to tell your customers today.'
      ),
      divider(),
      section(
        'Please join me in welcoming our 3 *new hires* to the Paper Company family! \n\n *Robert California*, CEO \n\n *Ryan Howard*, Temp \n\n *Erin Hannon*, Receptionist '
      ),
      divider(),
      context([
        ":pushpin: Do you have something to include in the newsletter? Here's *how to submit content*.",
      ]),
    ],
  },

  // 10 - Kitchen Sink
  {
    text: 'Kitchen Sink',
    blocks: [
      richTextBlock([
        richSection(['Hello there, I am a basic rich text block!']),
      ]),
      richTextBlock([
        richSection([
          'Hello there, ',
          richText('I am a bold rich text block!', { bold: true }),
        ]),
      ]),
      richTextBlock([
        richSection([
          'Hello there, ',
          richText('I am a strikethrough rich text block!', { strike: true }),
        ]),
      ]),
      richTextBlock([
        richSection([
          richEmoji('basketball'),
          ' ',
          richEmoji('snowboarder'),
          ' ',
          richEmoji('checkered_flag'),
        ]),
      ]),
      richTextBlock([
        richSection(['Basic bullet list with rich elements\n']),
        richList(
          'bullet',
          [
            richSection(['item 1: ', richEmoji('basketball')]),
            richSection(['item 2: ', 'this is a list item']),
            richSection([
              'item 3: ',
              richLink('https://example.com/', 'with a link', { bold: true }),
            ]),
            richSection(['item 4: ', 'we are near the end']),
            richSection(['item 5: ', 'this is the end']),
          ],
          { indent: 0 }
        ),
      ]),
      richTextBlock([
        richSection([
          'Check out these different block types with paragraph breaks between them:\n\n',
        ]),
        richPreformatted([
          'Hello there, I am preformatted block!\n\nI can have multiple paragraph breaks within the block.',
        ]),
        richSection([
          '\nI am rich text with a paragraph break following preformatted text. \n\nI can have multiple paragraph breaks within the block.\n\n',
        ]),
        richQuote([
          'I am a basic rich text quote, \n\nI can have multiple paragraph breaks within the block.',
        ]),
        richSection([
          '\nI am rich text with a paragraph after the quote block\n\n',
        ]),
        richQuote(['I am a basic quote block following rich text']),
        richSection(['\n']),
        richPreformatted([
          'I am more preformatted text following a quote block',
        ]),
        richSection(['\n']),
        richQuote(['I am a basic quote block following preformatted text']),
        richSection(['\n']),
        richList(
          'bullet',
          [richSection(['list item one']), richSection(['list item two'])],
          { indent: 0 }
        ),
        richSection(['\nI am rich text with a paragraph break after a list']),
      ]),
      // context_actions — Botarium-specific block, no block-kit factory
      {
        type: 'context_actions',
        elements: [
          {
            type: 'feedback_buttons',
            action_id: 'showcase_feedback',
            positive_button: {
              text: { type: 'plain_text', text: 'Good Response' },
              value: 'positive',
            },
            negative_button: {
              text: { type: 'plain_text', text: 'Bad Response' },
              value: 'negative',
            },
          },
          {
            type: 'icon_button',
            action_id: 'showcase_remove',
            icon: 'trash',
            text: { type: 'plain_text', text: 'Remove' },
          },
        ],
      },
      actions([
        button('Click Me', 'showcase_kitchen_sink_0', {
          value: 'click_me_123',
        }),
      ]),
      actions([
        conversationsSelect('showcase_kitchen_sink_convo_0', {
          placeholder: 'Select a conversation',
          initial_conversation: 'G12345678',
        }),
        usersSelect('showcase_kitchen_sink_1', {
          placeholder: 'Select a user',
          initial_user: 'U12345678',
        }),
        channelsSelect('showcase_kitchen_sink_2', {
          placeholder: 'Select a channel',
          initial_channel: 'C12345678',
        }),
      ]),
      actions([
        externalSelect('actionId-4', {
          placeholder: 'Search external data',
        }),
        multiUsersSelect('actionId-5', { placeholder: 'Select users' }),
        multiConversationsSelect('actionId-6', {
          placeholder: 'Select conversations',
        }),
        multiChannelsSelect('actionId-7', {
          placeholder: 'Select channels',
        }),
        multiExternalSelect('actionId-8', {
          placeholder: 'Search external items',
        }),
        staticSelect(
          'showcase_kitchen_sink_3',
          options([
            ['*plain_text option 0*', 'value-0'],
            ['*plain_text option 1*', 'value-1'],
            ['*plain_text option 2*', 'value-2'],
          ]),
          { placeholder: 'Select an item' }
        ),
      ]),
    ],
  },

  // 11 - Images
  {
    text: 'Images',
    blocks: [
      imageBlock(
        'https://assets3.thrillist.com/v1/image/1682388/size/tl-horizontal_main.jpg',
        'delicious tacos',
        { title: 'I love tacos' }
      ),
    ],
  },

  // 12 - Tables
  {
    text: 'Tables',
    blocks: [
      section('*Tables*'),
      table(
        [
          [
            cell('Feature', { bold: true }),
            cell('Status', { bold: true }),
            cell('Priority', { bold: true }),
          ],
          [
            cell('Authentication'),
            cell('Complete', { bold: true }),
            cell('High'),
          ],
          [
            cell('Dashboard'),
            cell('In Progress', { italic: true }),
            cell('Medium'),
          ],
          [cell('API v2'), cell('Planned'), cell('Low')],
          [cell('Mobile App'), cell('Blocked', { bold: true }), cell('High')],
        ],
        {
          column_settings: [
            { align: 'left', is_wrapped: true },
            { align: 'center' },
            { align: 'right' },
          ],
        }
      ),
    ],
  },

  // 13 - Template: Approval
  {
    text: 'Approval',
    blocks: [
      section(
        'You have a new request:\n*<google.com|Fred Enriquez - Time Off request>*'
      ),
      section(
        '*Type:*\nPaid time off\n*When:*\nAug 10-Aug 13\n*Hours:* 16.0 (2 days)\n*Remaining balance:* 32.0 hours (4 days)\n*Comments:* "Family in town, going camping!"',
        {
          accessory: image(
            'https://api.slack.com/img/blocks/bkb_template_images/approvalsNewDevice.png',
            'computer thumbnail'
          ),
        }
      ),
      actions([
        button('Approve', 'showcase_approval_approve_pto', {
          style: 'primary',
          value: 'click_me_123',
        }),
        button('Deny', 'showcase_approval_deny_pto', {
          style: 'danger',
          value: 'click_me_123',
        }),
      ]),
      section(
        'You have a new request:\n*<fakeLink.toEmployeeProfile.com|Fred Enriquez - New device request>*'
      ),
      sectionFields([
        '*Type:*\nComputer (laptop)',
        '*When:*\nSubmitted Aug 10',
        '*Last Update:*\nMar 10, 2015 (3 years, 5 months)',
        "*Reason:*\nAll vowel keys aren't working.",
        '*Specs:*\n"Cheetah Pro 15" - Fast, really fast',
      ]),
      actions([
        button('Approve', 'showcase_approval_approve_device', {
          style: 'primary',
          value: 'click_me_123',
        }),
        button('Deny', 'showcase_approval_deny_device', {
          style: 'danger',
          value: 'click_me_123',
        }),
      ]),
    ],
  },

  // 14 - Template: Notification
  {
    text: 'Notification',
    blocks: [
      section(
        plainText('Looks like you have a scheduling conflict with this event:')
      ),
      divider(),
      section(
        '*<fakeLink.toUserProfiles.com|Iris / Zelda 1-1>*\nTuesday, January 21 4:00-4:30pm\nBuilding 2 - Havarti Cheese (3)\n2 guests',
        {
          accessory: image(
            'https://api.slack.com/img/blocks/bkb_template_images/notifications.png',
            'calendar thumbnail'
          ),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/notificationsWarningIcon.png',
          'notifications warning icon'
        ),
        '*Conflicts with Team Huddle: 4:15-4:30pm*',
      ]),
      divider(),
      section('*Propose a new time:*'),
      section('*Today - 4:30-5pm*\nEveryone is available: @iris, @zelda', {
        accessory: button('Choose', 'showcase_notification_choose_today', {
          value: 'click_me_123',
        }),
      }),
      section('*Tomorrow - 4-4:30pm*\nEveryone is available: @iris, @zelda', {
        accessory: button('Choose', 'showcase_notification_choose_tomorrow_4', {
          value: 'click_me_123',
        }),
      }),
      section(
        "*Tomorrow - 6-6:30pm*\nSome people aren't available: @iris, ~@zelda~",
        {
          accessory: button(
            'Choose',
            'showcase_notification_choose_tomorrow_6',
            { value: 'click_me_123' }
          ),
        }
      ),
      section('*<fakelink.ToMoreTimes.com|Show more times>*'),
    ],
  },

  // 15 - Template: Vote
  {
    text: 'Vote',
    blocks: [
      section(
        '*Where should we order lunch from?* Poll by <fakeLink.toUser.com|Mark>'
      ),
      divider(),
      section(
        ':sushi: *Ace Wasabi Rock-n-Roll Sushi Bar*\nThe best landlocked sushi restaurant.',
        {
          accessory: button('Vote', 'showcase_vote_sushi', {
            value: 'click_me_123',
          }),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/profile_1.png',
          'Michael Scott'
        ),
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/profile_2.png',
          'Dwight Schrute'
        ),
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/profile_3.png',
          'Pam Beesly'
        ),
        plainText('3 votes'),
      ]),
      section(
        ':hamburger: *Super Hungryman Hamburgers*\nOnly for the hungriest of the hungry.',
        {
          accessory: button('Vote', 'showcase_vote_hamburger', {
            value: 'click_me_123',
          }),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/profile_4.png',
          'Angela'
        ),
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/profile_2.png',
          'Dwight Schrute'
        ),
        plainText('2 votes'),
      ]),
      section(
        ':ramen: *Kagawa-Ya Udon Noodle Shop*\nDo you like to shop for noodles? We have noodles.',
        {
          accessory: button('Vote', 'showcase_vote_ramen', {
            value: 'click_me_123',
          }),
        }
      ),
      context(['No votes']),
      divider(),
      actions([
        button('Add a suggestion', 'showcase_vote_add_suggestion', {
          value: 'click_me_123',
        }),
      ]),
    ],
  },

  // 16 - Search Results
  {
    text: 'Search Results',
    blocks: [
      section(
        'We found *205 Hotels* in New Orleans, LA from *12/14 to 12/17*',
        {
          accessory: overflow(
            'showcase_search_results_filter',
            options([
              ['Option One', 'value-0'],
              ['Option Two', 'value-1'],
              ['Option Three', 'value-2'],
              ['Option Four', 'value-3'],
            ])
          ),
        }
      ),
      divider(),
      section(
        '*<fakeLink.toHotelPage.com|Windsor Court Hotel>*\n\u2605\u2605\u2605\u2605\u2605\n$340 per night\nRated: 9.4 - Excellent',
        {
          accessory: image(
            'https://api.slack.com/img/blocks/bkb_template_images/tripAgent_1.png',
            'Windsor Court Hotel thumbnail'
          ),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/tripAgentLocationMarker.png',
          'Location Pin Icon'
        ),
        plainText('Location: Central Business District'),
      ]),
      divider(),
      section(
        '*<fakeLink.toHotelPage.com|The Ritz-Carlton New Orleans>*\n\u2605\u2605\u2605\u2605\u2605\n$340 per night\nRated: 9.1 - Excellent',
        {
          accessory: image(
            'https://api.slack.com/img/blocks/bkb_template_images/tripAgent_2.png',
            'Ritz-Carlton New Orleans thumbnail'
          ),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/tripAgentLocationMarker.png',
          'Location Pin Icon'
        ),
        plainText('Location: French Quarter'),
      ]),
      divider(),
      section(
        '*<fakeLink.toHotelPage.com|Omni Royal Orleans Hotel>*\n\u2605\u2605\u2605\u2605\u2605\n$419 per night\nRated: 8.8 - Excellent',
        {
          accessory: image(
            'https://api.slack.com/img/blocks/bkb_template_images/tripAgent_3.png',
            'Omni Royal Orleans Hotel thumbnail'
          ),
        }
      ),
      context([
        image(
          'https://api.slack.com/img/blocks/bkb_template_images/tripAgentLocationMarker.png',
          'Location Pin Icon'
        ),
        plainText('Location: French Quarter'),
      ]),
      divider(),
      actions([
        button('Next 2 Results', 'showcase_search_results_next', {
          value: 'click_me_123',
        }),
      ]),
    ],
  },
]
